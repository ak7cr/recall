from fastapi import APIRouter,HTTPException
from datetime import date
from ..models import ActionItem
from ..schemas import ActionPatch,ActionCreate
from ..db import SessionLocal
router=APIRouter()
def serialize(x):return {"id":x.id,"meeting_id":x.meeting_id,"task":x.task,"assignee":x.assignee,"deadline_text":x.deadline_text,"deadline_date":str(x.deadline_date) if x.deadline_date else None,"status":x.status,"assignee_explicit":x.assignee_explicit,"deadline_explicit":x.deadline_explicit,"evidence_quote":x.evidence_quote,"evidence_utterance_idx":x.evidence_utterance_idx}
@router.get("/actions")
def list_actions(status:str|None=None,assignee:str|None=None,meeting_id:str|None=None,overdue:bool=False,due_before:date|None=None):
 d=SessionLocal();q=d.query(ActionItem)
 if status:q=q.filter_by(status=status)
 if assignee:q=q.filter(ActionItem.assignee.ilike(f"%{assignee}%"))
 if meeting_id:q=q.filter_by(meeting_id=meeting_id)
 if overdue:q=q.filter(ActionItem.status!="done",ActionItem.deadline_date<date.today())
 if due_before:q=q.filter(ActionItem.deadline_date<=due_before)
 rows=[serialize(x) for x in q.order_by(ActionItem.deadline_date).all()];d.close();return rows
@router.patch("/actions/{action_id}")
def patch_action(action_id:str,patch:ActionPatch):
 d=SessionLocal();x=d.get(ActionItem,action_id)
 if not x:d.close();raise HTTPException(404,"Action not found")
 for k,v in patch.model_dump(exclude_unset=True).items():setattr(x,k,v)
 d.commit();d.refresh(x);r=serialize(x);d.close();return r
@router.post("/actions",status_code=201)
def create_action(payload:ActionCreate):
 d=SessionLocal();x=ActionItem(**payload.model_dump(),confidence=1,extraction_method="rules",assignee_explicit=bool(payload.assignee),deadline_explicit=bool(payload.deadline_text));d.add(x);d.commit();d.refresh(x);r=serialize(x);d.close();return r
