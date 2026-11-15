"""spaCy named-entity recognition with a small technology EntityRuler."""
_nlp=None
_last_method="not_run"
def loaded():return _nlp is not None
def last_method():return _last_method
def extract(utterances):
    global _nlp,_last_method
    try:
        import spacy
        if _nlp is None:
            _nlp=spacy.load("en_core_web_lg")
            ruler=_nlp.add_pipe("entity_ruler",before="ner",config={"overwrite_ents":False})
            ruler.add_patterns([{"label":"PRODUCT","pattern":x} for x in ["PostgreSQL","MongoDB","FastAPI","React","AWS","Ollama"]])
        _last_method="spacy_en_core_web_lg_entity_ruler"
        return [(e.text,e.label_,u.idx) for u in utterances for e in _nlp(u.text).ents if e.label_ in {"PERSON","ORG","DATE","TIME","GPE","PRODUCT","EVENT","MONEY"}]
    except Exception:_last_method="unavailable";return []
