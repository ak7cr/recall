"""Live QA and citation scoring against independent question/evidence annotations."""
import json
from pathlib import Path
import httpx
from eval.metrics import keyword_coverage
ROOT=Path(__file__).parent
def run():
    items=json.loads((ROOT/'data/qa_gold.json').read_text())
    try:
        health=httpx.get('http://localhost:8000/api/health',timeout=2).json()
        if not health.get('ollama',{}).get('model_present'):return {"status":"not run","reason":"Recall API or configured Ollama model is unavailable","question_count":len(items)}
    except Exception:return {"status":"not run","reason":"Recall API is not running","question_count":len(items)}
    records=[];refused=answerable=0;coverage=0.0;citation_hits=citation_total=gold_total=0
    with httpx.Client(base_url='http://localhost:8000/api',timeout=180) as client:
        for item in items:
            try:
                response=client.post('/chat',json={"question":item['question']});response.raise_for_status();result=response.json()
            except Exception as exc:return {"status":"not run","reason":f"chat request failed: {type(exc).__name__}: {exc}","question_count":len(items)}
            answer=result.get('answer','');citations=result.get('citations',[]);unanswerable=item.get('unanswerable',False)
            if unanswerable:
                correct=not citations and "couldn't find" in answer.casefold();refused+=int(correct)
            else:
                answerable+=1;score=keyword_coverage(answer,item.get('expected_keywords',[]));coverage+=score
                ids=set(item.get('meeting_ids',[]));ranges=item.get('evidence_ranges',{})
                if isinstance(ranges,list):ranges={mid:ranges for mid in ids}
                gold_total+=len(ids)
                for c in citations:
                    citation_total+=1;mid=c.get('meeting_id');span=(c.get('utterance_start_idx',0),c.get('utterance_end_idx',0))
                    allowed=ranges.get(mid,[]);hit=any(span[0]<=end and span[1]>=start for start,end in allowed)
                    citation_hits+=int(hit)
                correct=score>0
            records.append({"question":item['question'],"correctness":correct,"keyword_coverage":None if unanswerable else score,"citations":citations})
    return {"status":"measured","questions":len(items),"mean_keyword_coverage":coverage/max(1,answerable),"citation_precision":citation_hits/max(1,citation_total),"citation_recall":citation_hits/max(1,gold_total),"correct_refusal_rate":refused/max(1,sum(bool(x.get('unanswerable')) for x in items)),"records":records}
