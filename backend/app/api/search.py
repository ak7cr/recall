from fastapi import APIRouter
from ..db import SessionLocal
from ..rag.retriever import documents
from ..knowledge.hybrid import retrieve
router=APIRouter()
@router.get("/search")
def search(q:str,mode:str="hybrid",meeting_ids:str|None=None):
 d=SessionLocal(); ids=meeting_ids.split(",") if meeting_ids else None
 rows=retrieve(q,documents(d),mode=mode,meeting_ids=ids,top_k=20);out=[{**x,"score":1/(i+1)} for i,x in enumerate(rows)];d.close();return out
