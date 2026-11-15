def extract(utterances):
    try:
        import spacy
        nlp=spacy.load("en_core_web_lg")
        ruler=nlp.add_pipe("entity_ruler",before="ner",config={"overwrite_ents":False})
        ruler.add_patterns([{"label":"PRODUCT","pattern":x} for x in ["PostgreSQL","MongoDB","FastAPI","React","AWS","Ollama"]])
        return [(e.text,e.label_,u.idx) for u in utterances for e in nlp(u.text).ents if e.label_ in {"PERSON","ORG","DATE","TIME","GPE","PRODUCT","EVENT","MONEY"}]
    except Exception: return []
