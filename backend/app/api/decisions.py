from fastapi import APIRouter
from ..db import SessionLocal
from ..models import Decision
router=APIRouter()
@router.get("/decisions")
def list_decisions(meeting_id:str|None=None,status:str|None=None,topic:str|None=None):
 d=SessionLocal();q=d.query(Decision)
 if meeting_id:q=q.filter_by(meeting_id=meeting_id)
 if status:q=q.filter_by(status=status)
 if topic:q=q.filter(Decision.topic.ilike(f"%{topic}%"))
 r=[{"id":x.id,"meeting_id":x.meeting_id,"decision":x.decision,"topic":x.topic,"status":x.status,"evidence_quote":x.evidence_quote,"evidence_utterance_idx":x.evidence_utterance_idx} for x in q.all()];d.close();return r
