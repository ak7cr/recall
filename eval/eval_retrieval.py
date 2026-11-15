"""Recall@k and MRR measured against the independently annotated evidence ranges."""
from pathlib import Path
import json
from backend.app.knowledge.hybrid import retrieve
from backend.app.knowledge.embeddings import loaded
from backend.app.ingestion.transcript_parser import parse_transcript
from backend.app.ingestion.chunker import chunk_utterances
ROOT=Path(__file__).parent
def _metrics(mode,docs,questions):
    recalls={k:[] for k in [1,3,5,10]};rr=[]
    for item in questions:
        if item.get('unanswerable'):continue
        ranges=item.get('evidence_ranges',{})
        if isinstance(ranges,list):ranges={mid:ranges for mid in item.get('meeting_ids',[])}
        relevant=set()
        for d in docs:
            for start,end in ranges.get(d['meeting_id'],[]):
                if d['start']<=end and d['end']>=start:relevant.add(d['id'])
        if not relevant:continue
        ranked=retrieve(item['question'],docs,mode=mode,top_k=max(10,len(docs)))
        rel=[int(d['id'] in relevant) for d in ranked]
        first=next((i+1 for i,x in enumerate(rel) if x),None);rr.append(1/first if first else 0)
        for k in recalls:recalls[k].append(sum(rel[:k])/len(relevant))
    return {**{f'recall@{k}':sum(v)/max(1,len(v)) for k,v in recalls.items()},'mrr':sum(rr)/max(1,len(rr))}
def run():
    docs=[]
    for path in sorted((ROOT/'data/meetings').glob('*.txt')):
        rows=parse_transcript(path.read_text())
        for idx,(start,end,content) in enumerate(chunk_utterances(rows)):
            docs.append({"id":f'{path.stem}:{idx}',"meeting_id":path.stem,"title":path.stem,"text":content,"start":start,"end":end,"type":"meeting"})
    questions=json.loads((ROOT/'data/qa_gold.json').read_text())
    result={"bm25":{"status":"measured","metrics":_metrics('bm25',docs,questions)}}
    if not loaded():
        reason="all-MiniLM-L6-v2 weights are not loaded; dense and hybrid results are not reported as lexical substitutes"
        result['dense']={"status":"not run","reason":reason};result['hybrid']={"status":"not run","reason":reason}
    else:
        result['dense']={"status":"measured","metrics":_metrics('dense',docs,questions)}
        result['hybrid']={"status":"measured","metrics":_metrics('hybrid',docs,questions)}
    return result
