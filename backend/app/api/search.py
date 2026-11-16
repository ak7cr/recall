from fastapi import APIRouter
from ..db import SessionLocal
from ..rag.retriever import documents
from ..knowledge.hybrid import retrieve,last_method
router=APIRouter()
@router.get("/search")
def search(q:str,mode:str="hybrid",meeting_ids:str|None=None):
 d=SessionLocal(); ids=meeting_ids.split(",") if meeting_ids else None
 rows=retrieve(q,documents(d),mode=mode,meeting_ids=ids,top_k=20);actual=last_method()
 if mode=="dense" and actual=="unavailable_dense":d.close();return {"status":"unavailable","requested_mode":mode,"actual_mode":actual,"hits":[]}
 out=[{**x,"score":1/(i+1),"retrieval_mode":actual} for i,x in enumerate(rows)];d.close();return out
