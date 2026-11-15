import re, logging
from datetime import datetime
log=logging.getLogger(__name__)
PAT=re.compile(r"\b(?:i'll|i will|i can take|let me|we need to|we should|can you|please|action item:|\w+ will)\s+(.+?)(?:\s+(?:by|before)\s+(.+?))?[.!?]?\s*$",re.I)
def validate_evidence(quote, idx, utterances, threshold=85):
    """Return the exact matching utterance index, allowing one neighboring line."""
    try:
        from rapidfuzz.fuzz import partial_ratio
        for u in utterances:
            if abs(u.idx-int(idx))<=1 and partial_ratio(quote or "",u.text)>=threshold:return u.idx
    except Exception:return None
    return None
def extract(utterances, meeting_date, participants, method="rules"):
    output=[]
    for u in utterances:
        m=PAT.search(u.text.strip())
        if not m: continue
        task=m.group(1).strip(" ."); deadline=m.group(2)
        if len(task)<4: continue
        try:
            from dateparser import parse
            dt=parse(deadline,settings={"RELATIVE_BASE":datetime.combine(meeting_date,datetime.min.time()),"PREFER_DATES_FROM":"future"}) if deadline else None
        except Exception: dt=None
        first_person=bool(re.search(r"\b(i'll|i will|i can take|let me)\b",u.text,re.I))
        inferred=bool(re.search(r"\b(we need to|we should|can you|please)\b",u.text,re.I))
        assignee=u.speaker if first_person or inferred else None
        if assignee and participants:
            try:
                from rapidfuzz import process,fuzz
                matched=process.extractOne(assignee,participants,scorer=fuzz.ratio)
                if matched and matched[1]>=85:assignee=matched[0]
            except Exception:pass
        output.append(dict(task=task[:1].upper()+task[1:],assignee=assignee,deadline_text=deadline,deadline_date=dt.date() if dt else None,status="pending",assignee_explicit=first_person,deadline_explicit=bool(deadline),confidence=.55,evidence_utterance_idx=u.idx,evidence_quote=u.text,extraction_method="rules"))
    if method=="llm":
        try:
            from ..llm.ollama_client import client
            block="\n".join(f"[{u.idx}] {u.speaker}: {u.text}" for u in utterances)
            prompt='Extract only explicit commitments. Return JSON {"action_items":[{"task":"imperative task","assignee":null,"deadline_text":null,"evidence_utterance_idx":1,"evidence_quote":"verbatim","assignee_explicit":false,"deadline_explicit":false,"confidence":0.8}]}. Never invent details.\nExamples: [12] Rahul: We need to complete the authentication module by Friday. -> task Complete the authentication module, assignee Rahul, deadline Friday. [13] Anshuman: I\'ll handle the API integration. -> task Handle the API integration, assignee Anshuman. [14] Rahul: Great, I\'ll take care of testing. -> task Take care of testing, assignee Rahul.\n'+block
            import json
            data=json.loads(client.generate(prompt,json_mode=True))
            from rapidfuzz.fuzz import partial_ratio
            for item in data.get("action_items",[]):
                idx=int(item["evidence_utterance_idx"]); matched_idx=validate_evidence(item.get("evidence_quote",""),idx,utterances)
                evidence=next((x for x in utterances if x.idx==matched_idx),None)
                if not evidence: continue
                assignee=item.get("assignee")
                match=next((p for p in participants if p.lower()==str(assignee).lower()),assignee)
                dt=None
                if item.get("deadline_text"):
                    try:
                        from dateparser import parse
                        parsed=parse(item["deadline_text"],settings={"RELATIVE_BASE":datetime.combine(meeting_date,datetime.min.time()),"PREFER_DATES_FROM":"future"}); dt=parsed.date() if parsed else None
                    except Exception: pass
                output.append(dict(task=item["task"],assignee=match,deadline_text=item.get("deadline_text"),deadline_date=dt,status="pending",assignee_explicit=item.get("assignee_explicit",False),deadline_explicit=item.get("deadline_explicit",False),confidence=float(item.get("confidence",.7)),evidence_utterance_idx=matched_idx,evidence_quote=item["evidence_quote"],extraction_method="llm"))
        except Exception: log.exception("LLM action extraction unavailable")
    # Keep the strongest exact/near-duplicate; MiniLM is used when available, token overlap otherwise.
    deduped=[]
    for item in sorted(output,key=lambda x:x["confidence"],reverse=True):
        duplicate=False
        for prior in deduped:
            try:
                from ..knowledge.embeddings import encode
                vectors=encode([item["task"],prior["task"]])
                if vectors is None:raise RuntimeError("embedding model unavailable")
                similar=float(vectors[0]@vectors[1])>.85
            except Exception:
                a=set(item["task"].lower().split());b=set(prior["task"].lower().split());similar=len(a&b)/max(1,len(a|b))>.7
            if similar:duplicate=True;break
        if not duplicate:deduped.append(item)
    return deduped
