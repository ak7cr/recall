from fastapi import APIRouter
from datetime import date,timedelta
from sqlalchemy import func
from ..db import SessionLocal
from ..models import Meeting,ActionItem,Decision,Participant
router=APIRouter()
@router.get("/dashboard")
def dashboard():
 d=SessionLocal();today=date.today();m=d.query(Meeting).count();pending=d.query(ActionItem).filter(ActionItem.status=="pending").count();done=d.query(ActionItem).filter(ActionItem.status=="done").count();overdue=d.query(ActionItem).filter(ActionItem.status!="done",ActionItem.deadline_date<today).count();active=d.query(Decision).filter_by(status="active").count()
 upcoming=d.query(ActionItem).filter(ActionItem.status!="done",ActionItem.deadline_date>=today,ActionItem.deadline_date<=today+timedelta(days=14)).order_by(ActionItem.deadline_date).all()
 deadlines=[{"id":x.id,"task":x.task,"assignee":x.assignee,"deadline_date":str(x.deadline_date),"meeting_id":x.meeting_id} for x in upcoming]
 recent=[{"id":x.id,"title":x.title,"meeting_date":str(x.meeting_date),"status":x.status} for x in d.query(Meeting).order_by(Meeting.meeting_date.desc()).limit(6)]
 decisions=[{"decision":x.decision,"meeting_id":x.meeting_id} for x in d.query(Decision).filter_by(status="active").order_by(Decision.created_at.desc()).limit(5)]
 by_assignee=[{"assignee":a or "Unassigned","count":n} for a,n in d.query(ActionItem.assignee,func.count(ActionItem.id)).group_by(ActionItem.assignee)]
 weeks=[{"week":str(w),"count":n} for w,n in d.query(func.date(Meeting.meeting_date),func.count(Meeting.id)).group_by(func.date(Meeting.meeting_date)).order_by(func.date(Meeting.meeting_date))]
 d.close();return {"totals":{"meetings":m,"pending_actions":pending,"done_actions":done,"overdue_actions":overdue,"active_decisions":active},"upcoming_deadlines":deadlines,"recent_meetings":recent,"recent_decisions":decisions,"actions_by_assignee":by_assignee,"meetings_per_week":weeks}
