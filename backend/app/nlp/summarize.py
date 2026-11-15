"""Extractive and generative meeting summarization techniques."""
from ..llm.ollama_client import client
_pipelines={}
def loaded_models():return sorted(_pipelines)
def _windows(text, size=700):
    words=text.split()
    return [" ".join(words[i:i+size]) for i in range(0,len(words),size)] or [""]
def summarize(meeting, method="llm"):
    text="\n".join(f"{u.speaker}: {u.text}" for u in meeting.utterances)
    if method in {"bart","t5"}:
        from transformers import pipeline
        model="facebook/bart-large-cnn" if method=="bart" else "google/flan-t5-base"
        if method not in _pipelines:_pipelines[method]=pipeline("summarization",model=model,device=-1)
        summarizer=_pipelines[method]
        parts=[summarizer(p,max_length=140,min_length=40,do_sample=False)[0]["summary_text"] for p in _windows(text)]
        while len(" ".join(parts).split())>700:
            joined=" ".join(parts)
            parts=[summarizer(p,max_length=140,min_length=40,do_sample=False)[0]["summary_text"] for p in _windows(joined)]
        return summarizer(" ".join(parts),max_length=180,min_length=45,do_sample=False)[0]["summary_text"]
    try:
        mapped=[]
        for window in _windows(text):
            mapped.append(client.generate("Summarize this meeting segment in concise factual bullets. Preserve decisions, tasks, owners, and dates.\n"+window,temperature=.2))
        return client.generate("Combine these segment notes into a structured meeting summary: an overview of 3-6 sentences, then key points. Do not invent details.\n"+"\n".join(mapped),temperature=.2)
    except Exception: return "Summary unavailable: local Ollama is not reachable."
