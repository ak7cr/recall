"""ROUGE comparisons for model summaries against independent reference summaries."""
import json
from pathlib import Path
from eval.metrics import rouge_scores
ROOT=Path(__file__).parent
def run():
    try:from transformers import pipeline
    except ImportError:return {"status":"not run","reason":"transformers/torch are not installed"}
    models={"bart":"facebook/bart-large-cnn","t5":"google/flan-t5-base"}
    try:
        from ..backend.app.nlp.summarize import summarize
    except Exception:summarize=None
    rows=[]
    try:
        for path in sorted((ROOT/'data/meetings').glob('*.txt')):
            gold=json.loads((ROOT/'data/gold'/f'{path.stem}.json').read_text());reference=gold.get('summary')
            if not reference:continue
            text=path.read_text()
            for key,model in models.items():
                summarizer=pipeline('summarization',model=model,device=-1);prediction=summarizer(text[:12000],max_length=180,min_length=40,do_sample=False)[0]['summary_text']
                rows.append({"dataset":"gold","meeting":path.stem,"method":key,**rouge_scores(prediction,reference)})
    except Exception as exc:return {"status":"not run","reason":f"model weights unavailable or generation failed: {type(exc).__name__}: {exc}"}
    if not rows:return {"status":"not run","reason":"gold meeting references unavailable"}
    return {"status":"measured","samples":len(rows),"results":rows,"dialogsum":{"status":"not run","reason":"DialogSum 100-sample download/evaluation is not configured in this offline-safe run"}}
