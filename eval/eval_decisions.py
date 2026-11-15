"""Decision detection evaluation; rules are compared to independent gold decisions."""
import json
from pathlib import Path
from rapidfuzz.fuzz import partial_ratio
from backend.app.ingestion.transcript_parser import parse_transcript
from backend.app.nlp.decisions import extract
from backend.app.llm.ollama_client import client
ROOT=Path(__file__).parent
def _score(method):
    tp=fp=fn=0
    for path in sorted((ROOT/'data/meetings').glob('*.txt')):
        gp=ROOT/'data/gold'/f'{path.stem}.json'
        if not gp.exists():continue
        gold=json.loads(gp.read_text()).get('decisions',[]);pred=extract(parse_transcript(path.read_text()),method=method)
        pairs=sorted(((partial_ratio(p['decision'],g['decision']),i,j) for i,p in enumerate(pred) for j,g in enumerate(gold)),reverse=True)
        usedp=set();usedg=set()
        for score,i,j in pairs:
            if score>=70 and i not in usedp and j not in usedg:usedp.add(i);usedg.add(j)
        tp+=len(usedp);fp+=len(pred)-len(usedp);fn+=len(gold)-len(usedg)
    precision=tp/max(1,tp+fp);recall=tp/max(1,tp+fn)
    return {"status":"measured","precision":precision,"recall":recall,"f1":2*precision*recall/max(1e-12,precision+recall)}
def run():
    result={"rules":_score('rules'),"llm":{"status":"not run","reason":"Ollama/model unavailable"}}
    if client.status()["model_present"]:result['llm']=_score('llm')
    return result
