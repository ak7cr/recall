from fastapi import APIRouter,UploadFile,File,Form,HTTPException,BackgroundTasks
from datetime import date,datetime
from ..models import Meeting,Utterance,Participant,Summary,Topic,Entity,ActionItem,Decision,MeetingChunk,VectorDoc
from ..schemas import CompareRequest
from ..config import settings
from ..ingestion.parsers import extract_text
from ..pipeline import process_meeting
router=APIRouter()
def detail(db,m):
    def all_(model): return db.query(model).filter_by(meeting_id=m.id).all()
    return {"id":m.id,"title":m.title,"meeting_date":str(m.meeting_date),"source_filename":m.source_filename,"status":m.status,"error_message":m.error_message,"created_at":m.created_at.isoformat(),"summaries":[{"method":x.method,"summary_text":x.summary_text,"is_primary":x.is_primary} for x in all_(Summary)],"topics":[{"topic":x.topic,"score":x.score} for x in all_(Topic)],"participants":[{"speaker_name":x.speaker_name,"utterance_count":x.utterance_count,"word_count":x.word_count} for x in all_(Participant)],"entities":[{"text":x.text,"label":x.label,"utterance_idx":x.utterance_idx} for x in all_(Entity)],"decisions":[{"id":x.id,"decision":x.decision,"topic":x.topic,"status":x.status,"evidence_quote":x.evidence_quote,"evidence_utterance_idx":x.evidence_utterance_idx} for x in all_(Decision)],"action_items":[{"id":x.id,"task":x.task,"assignee":x.assignee,"deadline_text":x.deadline_text,"deadline_date":str(x.deadline_date) if x.deadline_date else None,"status":x.status,"assignee_explicit":x.assignee_explicit,"deadline_explicit":x.deadline_explicit,"evidence_quote":x.evidence_quote,"evidence_utterance_idx":x.evidence_utterance_idx} for x in all_(ActionItem)]}
@router.post("/meetings",status_code=202)
async def upload(background:BackgroundTasks,file:UploadFile=File(...),title:str|None=Form(None),meeting_date:str|None=Form(None),db=None):
    from ..db import SessionLocal
    db=SessionLocal()
    try:
        data=await file.read()
        if len(data)>settings.max_upload_mb*1024*1024: raise HTTPException(413,f"File exceeds {settings.max_upload_mb} MB")
        try:text=extract_text(file.filename or "transcript.txt",data)
        except ValueError as e: raise HTTPException(415,str(e))
        parsed=None
        if meeting_date:
            try: parsed=date.fromisoformat(meeting_date)
            except ValueError: raise HTTPException(422,"meeting_date must be YYYY-MM-DD")
        if not parsed:
            import re
            m=re.search(r"20\d\d[-_]\d\d[-_]\d\d",(file.filename or "")+" "+text[:100])
            try: parsed=date.fromisoformat(m.group().replace("_","-")) if m else date.today()
            except ValueError: parsed=date.today()
        row=Meeting(title=title or (file.filename or "Meeting").rsplit(".",1)[0],meeting_date=parsed,source_filename=file.filename,raw_text=text,status="uploaded")
        db.add(row); db.commit(); db.refresh(row); mid=row.id
        background.add_task(process_meeting,mid)
        return {"id":mid,"status":"uploaded"}
    finally: db.close()
@router.get("/meetings")
def list_meetings(q:str|None=None,status:str|None=None,db=None):
    from ..db import SessionLocal
    d=SessionLocal()
    try:
        query=d.query(Meeting)
        if q: query=query.filter(Meeting.title.ilike(f"%{q}%"))
        if status: query=query.filter_by(status=status)
        return [{"id":m.id,"title":m.title,"meeting_date":str(m.meeting_date),"status":m.status,"participants":d.query(Participant).filter_by(meeting_id=m.id).count(),"actions":d.query(ActionItem).filter_by(meeting_id=m.id).count(),"decisions":d.query(Decision).filter_by(meeting_id=m.id).count()} for m in query.order_by(Meeting.meeting_date.desc()).all()]
    finally:d.close()
@router.get("/meetings/{meeting_id}")
def get_meeting(meeting_id:str):
    from ..db import SessionLocal
    d=SessionLocal(); m=d.get(Meeting,meeting_id)
    if not m:d.close(); raise HTTPException(404,"Meeting not found")
    value=detail(d,m); d.close(); return value
@router.get("/meetings/{meeting_id}/transcript")
def transcript(meeting_id:str):
    from ..db import SessionLocal
    d=SessionLocal()
    try:return [{"idx":u.idx,"speaker":u.speaker,"text":u.text,"start_ts":u.start_ts} for u in d.query(Utterance).filter_by(meeting_id=meeting_id).order_by(Utterance.idx)]
    finally:d.close()
@router.get("/meetings/{meeting_id}/status")
def status(meeting_id:str):
    from ..db import SessionLocal
    d=SessionLocal();m=d.get(Meeting,meeting_id)
    if not m:d.close();raise HTTPException(404,"Meeting not found")
    r={"id":m.id,"status":m.status,"error_message":m.error_message};d.close();return r
@router.post("/meetings/{meeting_id}/reprocess",status_code=202)
def reprocess(meeting_id:str,background:BackgroundTasks):
    from ..db import SessionLocal
    d=SessionLocal();m=d.get(Meeting,meeting_id)
    if not m:d.close();raise HTTPException(404,"Meeting not found")
    m.status="uploaded";d.commit();d.close();background.add_task(process_meeting,meeting_id);return {"id":meeting_id,"status":"uploaded"}
@router.delete("/meetings/{meeting_id}",status_code=204)
def delete_meeting(meeting_id:str):
    from ..db import SessionLocal
    d=SessionLocal();m=d.get(Meeting,meeting_id)
    if not m:d.close();raise HTTPException(404,"Meeting not found")
    for model in [Utterance,Participant,Summary,Topic,Entity,ActionItem,Decision,MeetingChunk,VectorDoc]:d.query(model).filter_by(meeting_id=meeting_id).delete()
    d.delete(m);d.commit();d.close()
@router.post("/meetings/compare")
def compare(req:CompareRequest):
    from ..db import SessionLocal
    from ..llm.ollama_client import client
    from fastapi import HTTPException
    if len(req.meeting_ids)<2:raise HTTPException(422,"Select at least two meetings")
    d=SessionLocal(); rows=[]
    for mid in req.meeting_ids:
        m=d.get(Meeting,mid)
        if m:rows.append(detail(d,m))
    d.close()
    try: text=client.generate("Compare these meetings chronologically. Describe new, changed, and dropped decisions/tasks using only the supplied records.\n"+str(rows),temperature=.2)
    except Exception:text="Comparison unavailable: local Ollama is not reachable. Records are shown below."
    return {"comparison":text,"meetings":rows}
