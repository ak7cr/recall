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
