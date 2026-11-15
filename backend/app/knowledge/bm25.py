def tokenize(text): return [w.lower() for w in text.split()]
def rank(query, docs):
    if not docs: return []
    try:
        from rank_bm25 import BM25Okapi
        scores=BM25Okapi([tokenize(d["text"]) for d in docs]).get_scores(tokenize(query))
        return sorted(zip(docs,scores),key=lambda x:x[1],reverse=True)
    except Exception:
        terms=set(tokenize(query)); return sorted(((d,len(terms&set(tokenize(d["text"])))) for d in docs),key=lambda x:x[1],reverse=True)
