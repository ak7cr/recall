"""KeyBERT topic extraction with MMR and a lexical fallback."""
_last_method="not_run"
def last_method():return _last_method
def extract(text):
    global _last_method
    try:
        from keybert import KeyBERT
        _last_method="keybert_mmr"
        return KeyBERT(model="all-MiniLM-L6-v2").extract_keywords(text,keyphrase_ngram_range=(1,3),top_n=8,use_mmr=True,diversity=.5)
    except Exception:
        _last_method="frequency_fallback"
        words=[w.strip(".,?!:;").lower() for w in text.split() if len(w)>5]
        counts={w:words.count(w) for w in set(words)}
        return [(w,min(.99,n/max(1,len(words)))) for w,n in sorted(counts.items(),key=lambda x:-x[1])[:8]]
