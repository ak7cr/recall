from .bm25 import rank
def retrieve(query, docs, mode="hybrid", top_k=12, meeting_ids=None, per_meeting_cap=None):
    docs=[d for d in docs if not meeting_ids or d["meeting_id"] in meeting_ids]
    lexical=rank(query,docs); scores={}
    if mode in {"bm25","hybrid"}:
        for i,(d,_) in enumerate(lexical): scores[d["id"]]=scores.get(d["id"],0)+1/(60+i+1)
    if mode in {"dense","hybrid"}:
        try:
            from .embeddings import encode
            vectors=encode([query]+[d["text"] for d in docs])
            if vectors is not None:
                dense=sorted(zip(docs,vectors[1:]@vectors[0]),key=lambda x:float(x[1]),reverse=True)
                for i,(d,_) in enumerate(dense):scores[d["id"]]=scores.get(d["id"],0)+1/(60+i+1)
        except Exception:pass
    if mode not in {"bm25","dense","hybrid"}:raise ValueError("mode must be dense, bm25, or hybrid")
    ordered=sorted(docs,key=lambda d:scores.get(d["id"],0),reverse=True); out=[]; counts={}
    for d in ordered:
        mid=d["meeting_id"]
        if per_meeting_cap and counts.get(mid,0)>=per_meeting_cap: continue
        out.append(d); counts[mid]=counts.get(mid,0)+1
        if len(out)>=top_k: break
    return out
