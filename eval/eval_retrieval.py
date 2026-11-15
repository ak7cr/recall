from pathlib import Path
import json
from eval.metrics import precision_recall_f1
from backend.app.knowledge.hybrid import retrieve
def run():
    root=Path(__file__).parent;docs=[]
    for p in sorted((root/'data/meetings').glob('*.txt')): docs.append({"id":p.stem,"meeting_id":p.stem,"title":p.stem,"date":p.stem,"text":p.read_text(),"start":1,"end":25,"type":"meeting"})
    q=json.loads((root/'data/qa_gold.json').read_text());hits=[];ranks=[]
    for item in q:
        if item.get('unanswerable'):continue
        rows=retrieve(item['question'],docs,top_k=10);rank=next((i+1 for i,x in enumerate(rows) if x['meeting_id'] in item['meeting_ids']),None);ranks.append(1/rank if rank else 0)
        hits.append({f"recall@{k}":sum(any(mid==x['meeting_id'] for x in rows[:k]) for mid in item['meeting_ids'])/max(1,len(item['meeting_ids'])) for k in [1,3,5,10]})
    return {f"recall@{k}":sum(x[f"recall@{k}"] for x in hits)/max(1,len(hits)) for k in [1,3,5,10]}|{"mrr":sum(ranks)/max(1,len(ranks))}
