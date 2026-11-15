def extract(text):
    try:
        from keybert import KeyBERT
        return KeyBERT(model="all-MiniLM-L6-v2").extract_keywords(text,keyphrase_ngram_range=(1,3),top_n=8,use_mmr=True,diversity=.5)
    except Exception:
        words=[w.strip(".,?!:;").lower() for w in text.split() if len(w)>5]
        counts={w:words.count(w) for w in set(words)}
        return [(w,min(.99,n/max(1,len(words)))) for w,n in sorted(counts.items(),key=lambda x:-x[1])[:8]]
