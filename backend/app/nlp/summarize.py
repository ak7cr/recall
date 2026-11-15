from ..llm.ollama_client import client
def summarize(meeting, method="llm"):
    text="\n".join(f"{u.speaker}: {u.text}" for u in meeting.utterances)
    if method in {"bart","t5"}:
        from transformers import pipeline
        model="facebook/bart-large-cnn" if method=="bart" else "google/flan-t5-base"
        summarizer=pipeline("summarization",model=model,device=-1)
        parts=[text[i:i+2500] for i in range(0,len(text),2500)]
        return " ".join(summarizer(p,max_length=140,min_length=40,do_sample=False)[0]["summary_text"] for p in parts)
    try:
        prompt="Summarize this meeting in 3-6 sentences followed by key points. Return concise factual text only.\n"+text[:24000]
        return client.generate(prompt,temperature=0.2)
    except Exception: return "Summary unavailable: local Ollama is not reachable."
