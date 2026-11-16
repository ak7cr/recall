import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
from backend.app.ingestion.transcript_parser import parse_transcript
from backend.app.ingestion.chunker import chunk_utterances
from backend.app.knowledge.hybrid import retrieve
from backend.app.rag.citations import verify
from backend.app.nlp.actions import extract,validate_evidence
from backend.app.nlp.dates import resolve_deadline
from datetime import date
def test_transcript_formats_and_continuations():
    rows=parse_transcript('[00:01:02] Rahul: Hello\ncontinuation\n00:02:00 Priya: Hi\nAnshuman (00:03:00): Okay\nUnknown plain paragraph')
    assert rows[0].speaker=='Rahul' and 'continuation' in rows[0].text
    assert rows[1].speaker=='Priya' and rows[2].speaker=='Anshuman'
    formats=parse_transcript('rahul: plain speaker format\n[00:04:05] meera: bracket timestamp\n00:05:06 priya: bare timestamp\nanshuman (00:06:07): parenthesis timestamp\n\nUnlabeled paragraph')
    assert [x.speaker for x in formats]==['Rahul','Meera','Priya','Anshuman','Unknown']
    assert formats[1].start_ts==245 and formats[2].start_ts==306 and formats[3].start_ts==367
def test_chunker_tracks_ranges():
    rows=parse_transcript('\n'.join(f'Speaker: words {i} '+('text '*30) for i in range(20)))
    chunks=chunk_utterances(rows);assert chunks and chunks[0][0]==1 and chunks[-1][1]==20
    assert all(a[1]==b[0] for a,b in zip(chunks,chunks[1:]))
def test_hybrid_retrieval():
    docs=[{"id":"a","meeting_id":"m1","text":"database PostgreSQL migration"},{"id":"b","meeting_id":"m2","text":"weekend plans"}]
    assert retrieve('PostgreSQL database',docs)[0]['id']=='a'
def test_citation_verification():
    source={'S1':{'citation':{'meeting_id':'m','snippet':'quote'}}};assert verify(['S1','S9'],source)==[{'meeting_id':'m','snippet':'quote'}]
def test_rh_example_deadline_and_assignees():
    rows=parse_transcript("Rahul: We need to complete the authentication module by Friday.\nAnshuman: I'll handle the API integration.\nRahul: Great, I'll take care of testing.")
    actions=extract(rows,date(2024,11,12),["Rahul","Anshuman"])
    assert len(actions)==3
    assert [x['assignee'] for x in actions]==['Rahul','Anshuman','Rahul']
    assert actions[0]['deadline_date']==date(2024,11,15)
    assert resolve_deadline('Friday',date(2024,11,12))==date(2024,11,15)
def test_evidence_validates_neighbor_and_rejects_unmatched():
    rows=parse_transcript('Rahul: I will prepare the report.\nPriya: We will review the results.')
    assert validate_evidence('review the results',1,rows)==2
    assert validate_evidence('unrelated phrase',1,rows) is None
def test_supersession_marks_prior_decision():
    from types import SimpleNamespace
    from backend.app.knowledge.supersession import compare_prior
    old=SimpleNamespace(decision='Use MongoDB for vendor service',status='active',superseded_by_id=None)
    new=SimpleNamespace(id='new-id',decision='Move vendor service to PostgreSQL')
    class FakeLLM:
        def generate(self,*args,**kwargs):return '{"relationship":"supersedes","reason":"new supported connector"}'
    compare_prior(new,[old],FakeLLM());assert old.status=='superseded' and old.superseded_by_id=='new-id'
def test_document_parsers_txt_docx_pdf():
    from backend.app.ingestion.parsers import extract_text
    from io import BytesIO
    from docx import Document
    from pypdf import PdfWriter
    doc=Document();doc.add_paragraph('Rahul: DOCX transcript sentence.');buf=BytesIO();doc.save(buf)
    assert 'DOCX transcript' in extract_text('notes.docx',buf.getvalue())
    writer=PdfWriter();writer.add_blank_page(width=72,height=72);pdf=BytesIO();writer.write(pdf)
    assert extract_text('notes.pdf',pdf.getvalue())==''
    assert extract_text('notes.txt',b'hello')=='hello'
def test_retrieval_modes_and_per_meeting_cap(monkeypatch):
    import numpy as np
    from backend.app.knowledge import embeddings
    docs=[{"id":"a","meeting_id":"m1","text":"database migration postgres"},{"id":"b","meeting_id":"m1","text":"postgres sql schema"},{"id":"c","meeting_id":"m2","text":"other unrelated"}]
    monkeypatch.setattr(embeddings,'encode',lambda texts:np.array([[1.,0.],[0.,1.],[1.,0.],[0.,1.]]))
    assert retrieve('database migration postgres',docs,mode='bm25',top_k=1)[0]['id']=='a'
    assert retrieve('database migration postgres',docs,mode='dense',top_k=1)[0]['id']=='b'
    rows=retrieve('database migration postgres',docs,mode='hybrid',top_k=3,per_meeting_cap=1)
    assert len(rows)==2 and len({x['meeting_id'] for x in rows})==2
