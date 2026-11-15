"""Independent action extraction evaluation against hand-authored gold records."""
import json
from datetime import date
from pathlib import Path
from backend.app.ingestion.transcript_parser import parse_transcript
from backend.app.nlp.actions import extract
from backend.app.knowledge.embeddings import loaded,encode
from backend.app.llm.ollama_client import client
ROOT=Path(__file__).parent
def _run_method(method):
    pred_total=gold_total=true_positive=0;assignee_ok=deadline_ok=field_total=0
    for path in sorted((ROOT/'data/meetings').glob('*.txt')):
        name=path.stem;gold_path=ROOT/'data/gold'/f'{name}.json'
        if not gold_path.exists():continue
        rows=parse_transcript(path.read_text());record=json.loads(gold_path.read_text());expected=record.get('action_items',[])
        try:meeting_day=date(2024,11,int(name.removeprefix('meeting')))
        except ValueError:meeting_day=date(2024,11,15)
        actual=extract(rows,meeting_day,sorted({r.speaker for r in rows}),method=method)
        vectors=encode([x['task'] for x in actual]+[x['task'] for x in expected])
        if vectors is None:return {"status":"not run","reason":"MiniLM weights unavailable; task matching requires embedding cosine > 0.7"}
        matrix=vectors[len(actual):]
        candidates=[]
        for i,p in enumerate(actual):
            for j,g in enumerate(expected):
                similarity=float(vectors[i]@matrix[j])
                if (p.get('assignee') or '').casefold()==(g.get('assignee') or '').casefold() and similarity>.7:candidates.append((similarity,i,j))
        matched_p=set();matched_g=set()
        for _,i,j in sorted(candidates,reverse=True):
            if i in matched_p or j in matched_g:continue
            matched_p.add(i);matched_g.add(j)
            p,g=actual[i],expected[j];field_total+=1
            assignee_ok+=((p.get('assignee') or '').casefold()==(g.get('assignee') or '').casefold())
            deadline_ok+=((p.get('deadline_text') or '').casefold()==(g.get('deadline_text') or '').casefold())
        true_positive+=len(matched_p);pred_total+=len(actual);gold_total+=len(expected)
    precision=true_positive/max(1,pred_total);recall=true_positive/max(1,gold_total)
    return {"status":"measured","precision":precision,"recall":recall,"f1":2*precision*recall/max(1e-12,precision+recall),"assignee_accuracy":assignee_ok/max(1,field_total),"deadline_accuracy":deadline_ok/max(1,field_total)}
def run():
    result={"rules":{"status":"not run","reason":"MiniLM weights unavailable"},"llm":{"status":"not run","reason":"Ollama/model and MiniLM required"}}
    if not loaded():return result
    result["rules"]=_run_method("rules")
    if client.status()["model_present"]:result["llm"]=_run_method("llm")
    return result
