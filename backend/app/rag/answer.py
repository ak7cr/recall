import json
from .prompts import ANSWER_SYSTEM
def answer(question, docs, llm):
    source_map={}; blocks=[]
    for i,d in enumerate(docs,1):
        key=f"S{i}"; citation={"meeting_id":d["meeting_id"],"meeting_title":d["title"],"meeting_date":str(d["date"]),"utterance_start_idx":d["start"],"utterance_end_idx":d["end"],"snippet":d["text"][:500]}
        source_map[key]={"citation":citation}; blocks.append(f"[{key}] Meeting {d['title']} ({d['date']}), lines {d['start']}-{d['end']} ({d['type']}): {d['text']}")
    if not docs:return {"answer":"I couldn't find that in your meetings.","citations":[],"generation_status":"no_evidence"}
    try:
        raw=llm.generate(ANSWER_SYSTEM+"\nQuestion: "+question+"\nSources:\n"+"\n".join(blocks),temperature=.2,json_mode=True); result=json.loads(raw)
        used=result.get("used_sources",[]); return {"answer":result.get("answer","I couldn't find that in your meetings."),"citations":[source_map[k]["citation"] for k in used if k in source_map],"generation_status":"ok"}
    except Exception:return {"answer":"I couldn't generate an evidence-grounded answer because the configured Ollama model is unavailable. Please check the local Ollama service and model.","citations":[],"generation_status":"ollama_unavailable"}
