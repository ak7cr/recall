from .bm25 import rank
_last_method="not_run"
def last_method():return _last_method
def retrieve(query, docs, mode="hybrid", top_k=12, meeting_ids=None, per_meeting_cap=None):
    global _last_method
    docs=[d for d in docs if not meeting_ids or d["meeting_id"] in meeting_ids]
    lexical=rank(query,docs); scores={}
    if mode in {"bm25","hybrid"}:
        for i,(d,_) in enumerate(lexical): scores[d["id"]]=scores.get(d["id"],0)+1/(60+i+1)
    dense_used=False
    if mode in {"dense","hybrid"}:
        try:
            from .embeddings import encode
            vectors=encode([query]+[d["text"] for d in docs])
            if vectors is not None:
                dense_used=True
                dense=sorted(zip(docs,vectors[1:]@vectors[0]),key=lambda x:float(x[1]),reverse=True)
                for i,(d,_) in enumerate(dense):scores[d["id"]]=scores.get(d["id"],0)+1/(60+i+1)
        except Exception:pass
    if mode not in {"bm25","dense","hybrid"}:raise ValueError("mode must be dense, bm25, or hybrid")
    _last_method="bm25" if mode=="bm25" else ("dense_minilm" if mode=="dense" and dense_used else "unavailable_dense") if mode=="dense" else ("hybrid_bm25_minilm_rrf" if dense_used else "bm25_only_fallback")
    ordered=sorted(docs,key=lambda d:scores.get(d["id"],0),reverse=True); out=[]; counts={}
    for d in ordered:
        mid=d["meeting_id"]
        if per_meeting_cap and counts.get(mid,0)>=per_meeting_cap: continue
        out.append(d); counts[mid]=counts.get(mid,0)+1
        if len(out)>=top_k: break
    return out
