import re
CUES=("we decided","let's go with","we'll use","agreed","the decision is","we're going with","approved","final call")
def extract(utterances, method="rules"):
    rows=[]
    for u in utterances:
        if any(c in u.text.lower() for c in CUES):
            rows.append(dict(decision=u.text.strip(),topic=None,evidence_utterance_idx=u.idx,evidence_quote=u.text,status="active",extraction_method="rules"))
    if method=="llm":
        try:
            import json
            from ..llm.ollama_client import client
            block="\n".join(f"[{u.idx}] {u.speaker}: {u.text}" for u in utterances)
            data=json.loads(client.generate('Return JSON {"decisions":[{"decision":"...","topic":"...","evidence_utterance_idx":1,"evidence_quote":"verbatim"}]}. Extract stated decisions only.\n'+block,json_mode=True))
            from rapidfuzz.fuzz import partial_ratio
            for x in data.get("decisions",[]):
                from .actions import validate_evidence
                idx=validate_evidence(x.get("evidence_quote",""),int(x["evidence_utterance_idx"]),utterances)
                u=next((v for v in utterances if v.idx==idx),None)
                if u: rows.append(dict(decision=x["decision"],topic=x.get("topic"),evidence_utterance_idx=u.idx,evidence_quote=x["evidence_quote"],status="active",extraction_method="llm"))
        except Exception: pass
    return rows
