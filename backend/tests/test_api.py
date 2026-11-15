import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app
import json
def test_health_smoke():
    response=TestClient(app).get('/api/health');assert response.status_code==200 and 'database' in response.json()
def test_pipeline_processes_rh_example(monkeypatch):
    from app.db import SessionLocal
    from app.models import Meeting,ActionItem,Summary
    from app.pipeline import process_meeting
    from app.llm.ollama_client import client
    from datetime import date
    transcript="Rahul: We need to complete the authentication module by Friday.\nAnshuman: I'll handle the API integration.\nRahul: Great, I'll take care of testing."
    def fake_generate(prompt,temperature=0.0,json_mode=False):
        if 'Summarize this meeting' in prompt:return 'The team assigned three deliverables.'
        if 'Extract only explicit commitments' in prompt:return json.dumps({'action_items':[]})
        if 'Return JSON' in prompt:return json.dumps({'decisions':[]})
        return '{}'
    monkeypatch.setattr(client,'generate',fake_generate)
    db=SessionLocal();meeting=Meeting(title='Test',meeting_date=date(2024,11,12),raw_text=transcript,status='uploaded');db.add(meeting);db.commit();mid=meeting.id;db.close()
    process_meeting(mid)
    db=SessionLocal();meeting=db.get(Meeting,mid)
    assert meeting.status=='ready'
    assert db.query(ActionItem).filter_by(meeting_id=mid).count()==3
    assert db.query(Summary).filter_by(meeting_id=mid).count()==1
    db.delete(meeting);db.commit();db.close()

def test_rest_routes_and_upload_to_chat(monkeypatch):
    from app.db import SessionLocal
    from app.models import Meeting
    from app.llm.ollama_client import client
    import json
    def fake_generate(prompt,temperature=0.0,json_mode=False):
        low=prompt.lower()
        if 'summarize this meeting segment' in low:return 'The meeting assigned authentication and API work.'
        if 'combine these segment notes' in low:return 'Overview: The team discussed architecture. Key points: PostgreSQL migration.'
        if 'extract only explicit commitments' in low:return json.dumps({'action_items':[]})
        if 'extract stated decisions only' in low:return json.dumps({'decisions':[]})
        if 'rewrite the follow-up' in low:return 'PostgreSQL architecture decision'
        if 'answer only from the supplied meeting sources' in low:
            return json.dumps({'answer':'They selected PostgreSQL for the migration. [S1]','used_sources':['S1']})
        if 'compare these meetings' in low:return 'The meetings keep PostgreSQL and revise the rollout.'
        return '{}'
    monkeypatch.setattr(client,'generate',fake_generate)
    api=TestClient(app)
    transcript=b"Rahul: We need to complete the authentication module by Friday.\nAnshuman: I'll handle the API integration.\nRahul: Great, I'll take care of testing.\nMeera: We decided to use PostgreSQL."
    uploaded=[]
    for name in ['architecture-one','architecture-two']:
        response=api.post('/api/meetings',files={'file':(name+'.txt',transcript,'text/plain')},data={'meeting_date':'2024-11-12'})
        assert response.status_code==202;uploaded.append(response.json()['id'])
    mid=uploaded[0]
    assert api.get('/api/meetings').status_code==200
    detail=api.get(f'/api/meetings/{mid}').json();assert detail['status']=='ready'
    assert detail['processing_metadata']['actions']['status']=='complete'
    assert api.get(f'/api/meetings/{mid}/transcript').json()[0]['idx']==1
    assert api.get(f'/api/meetings/{mid}/status').json()['status']=='ready'
    assert len(detail['action_items'])==3
    created=api.post('/api/actions',json={'meeting_id':mid,'task':'Write API smoke test','assignee':'Priya','evidence_utterance_idx':2,'evidence_quote':'manual'});assert created.status_code==201
    aid=created.json()['id'];assert api.get('/api/actions',params={'assignee':'Priya'}).status_code==200
    assert api.patch(f'/api/actions/{aid}',json={'status':'done'}).json()['status']=='done'
    assert api.get('/api/decisions',params={'meeting_id':mid}).status_code==200
    assert api.get('/api/search',params={'q':'PostgreSQL','mode':'bm25'}).status_code==200
    assert api.get('/api/dashboard').status_code==200
    compare=api.post('/api/meetings/compare',json={'meeting_ids':uploaded});assert compare.status_code==200
    answer=api.post('/api/chat',json={'question':'What database did we select?','meeting_ids':[mid]});assert answer.status_code==200 and answer.json()['citations']
    conv=answer.json()['conversation_id'];assert api.get('/api/conversations').status_code==200
    assert api.get(f'/api/conversations/{conv}').status_code==200
    assert api.delete(f'/api/conversations/{conv}').status_code==204
    assert api.post(f'/api/meetings/{mid}/reprocess').status_code==202
    for meeting_id in uploaded:assert api.delete(f'/api/meetings/{meeting_id}').status_code==204
