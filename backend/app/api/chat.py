from fastapi import APIRouter
from ..db import SessionLocal
from ..models import Conversation,Message,Meeting,ActionItem,Decision
from ..schemas import ChatRequest
from ..llm.ollama_client import client
from ..rag.query_rewrite import rewrite
from ..rag.retriever import documents
from ..rag.answer import answer
from ..knowledge.hybrid import retrieve,last_method
router=APIRouter()
@router.get("/conversations")
def conversations():
 d=SessionLocal();r=[{"id":x.id,"title":x.title,"created_at":x.created_at.isoformat()} for x in d.query(Conversation).order_by(Conversation.created_at.desc()).all()];d.close();return r
@router.post("/chat")
def chat(req:ChatRequest):
 d=SessionLocal();conv=d.get(Conversation,req.conversation_id) if req.conversation_id else None
 if not conv:conv=Conversation(title=req.question[:80]);d.add(conv);d.commit();d.refresh(conv)
 history=[x.content for x in d.query(Message).filter_by(conversation_id=conv.id).order_by(Message.created_at.desc()).limit(6).all()][::-1]
 d.add(Message(conversation_id=conv.id,role="user",content=req.question));d.commit()
 question=rewrite(req.question,history,client); docs=retrieve(question,documents(d),top_k=12,meeting_ids=req.meeting_ids,per_meeting_cap=3 if not req.meeting_ids else None)
 # SQL-backed structured results supplement lexical retrieval for task and decision requests.
 low=req.question.lower()
 if any(k in low for k in ["pending","tasks","assigned","deadline","overdue"]):
  q=d.query(ActionItem).filter(ActionItem.status!="done")
  if req.meeting_ids:q=q.filter(ActionItem.meeting_id.in_(req.meeting_ids))
  for x in q.limit(30):
   m=d.get(Meeting,x.meeting_id);docs.append(dict(id=x.id,meeting_id=x.meeting_id,title=m.title,date=m.meeting_date,text=f"Action item: {x.task}; assignee: {x.assignee}; deadline: {x.deadline_text or 'Not specified'}; status: {x.status}; evidence: {x.evidence_quote}",start=x.evidence_utterance_idx,end=x.evidence_utterance_idx,type="action"))
 elif "decision" in low:
  q=d.query(Decision).filter_by(status="active")
  if req.meeting_ids:q=q.filter(Decision.meeting_id.in_(req.meeting_ids))
  for x in q.limit(30):
   m=d.get(Meeting,x.meeting_id);docs.append(dict(id=x.id,meeting_id=x.meeting_id,title=m.title,date=m.meeting_date,text=f"Decision: {x.decision}; evidence: {x.evidence_quote}",start=x.evidence_utterance_idx,end=x.evidence_utterance_idx,type="decision"))
 docs=sorted(docs,key=lambda x:(x["date"],x["start"]))[:10];actual_retrieval=last_method();result=answer(question,docs,client)
 d.add(Message(conversation_id=conv.id,role="assistant",content=result["answer"],citations=result["citations"]));d.commit(); result.update(conversation_id=conv.id,retrieval_mode=actual_retrieval,retrieved_sources=len(docs));d.close();return result
@router.get("/conversations/{conversation_id}")
def conversation(conversation_id:str):
 d=SessionLocal();r={"id":conversation_id,"messages":[{"role":x.role,"content":x.content,"citations":x.citations} for x in d.query(Message).filter_by(conversation_id=conversation_id).order_by(Message.created_at)]};d.close();return r
@router.delete("/conversations/{conversation_id}",status_code=204)
def delete_conversation(conversation_id:str):
 d=SessionLocal();d.query(Message).filter_by(conversation_id=conversation_id).delete();c=d.get(Conversation,conversation_id)
 if c:d.delete(c)
 d.commit();d.close()
