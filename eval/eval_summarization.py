"""ROUGE comparisons for model summaries against independent reference summaries."""
import json
from pathlib import Path
from eval.metrics import rouge_scores
ROOT=Path(__file__).parent
def run():
    try:from transformers import pipeline
    except ImportError:return {"status":"not run","reason":"transformers/torch are not installed"}
    models={"bart":"facebook/bart-large-cnn","t5":"google/flan-t5-base"}
    dialogsum_status={"status":"not run","reason":"datasets package or DialogSum cache unavailable"}
    try:
        from datasets import load_dataset
        ds=load_dataset('knkarthick/dialogsum',split='test')
        dialogsum=ds.shuffle(seed=17).select(range(min(100,len(ds))))
        dialogsum_status={"status":"loaded","samples":len(dialogsum)}
    except Exception as exc:dialogsum_status={"status":"not run","reason":f"DialogSum unavailable/offline: {type(exc).__name__}: {exc}"}
    rows=[]
    try:
        from backend.app.nlp.summarize import summarize
        from types import SimpleNamespace
        for path in sorted((ROOT/'data/meetings').glob('*.txt')):
            gold=json.loads((ROOT/'data/gold'/f'{path.stem}.json').read_text());reference=gold.get('summary')
            if not reference:continue
            utterances=__import__('backend.app.ingestion.transcript_parser',fromlist=['parse_transcript']).parse_transcript(path.read_text())
            for key,model in models.items():
                prediction=summarize(SimpleNamespace(utterances=utterances),key)
                rows.append({"dataset":"gold","meeting":path.stem,"method":key,**rouge_scores(prediction,reference)})
        if dialogsum_status.get('status')=='loaded':
            parser=__import__('backend.app.ingestion.transcript_parser',fromlist=['parse_transcript']).parse_transcript
            for sample_idx,sample in enumerate(dialogsum):
                utterances=parser(sample['dialogue'])
                for key in models:
                    prediction=summarize(SimpleNamespace(utterances=utterances),key)
                    rows.append({"dataset":"dialogsum","sample":sample_idx,"method":key,**rouge_scores(prediction,sample['summary'])})
        from backend.app.llm.ollama_client import client
        if client.status()['model_present']:
            for path in sorted((ROOT/'data/meetings').glob('*.txt')):
                gold=json.loads((ROOT/'data/gold'/f'{path.stem}.json').read_text());reference=gold.get('summary')
                if not reference:continue
                utterances=__import__('backend.app.ingestion.transcript_parser',fromlist=['parse_transcript']).parse_transcript(path.read_text())
                prediction=summarize(SimpleNamespace(utterances=utterances),'llm')
                rows.append({"dataset":"gold","meeting":path.stem,"method":"llm","rouge1":rouge_scores(prediction,reference)['rouge1'],"rouge2":rouge_scores(prediction,reference)['rouge2'],"rougeL":rouge_scores(prediction,reference)['rougeL']})
    except Exception as exc:return {"status":"not run","reason":f"model weights unavailable or generation failed: {type(exc).__name__}: {exc}"}
    if not rows:return {"status":"not run","reason":"gold meeting references unavailable"}
    return {"status":"measured","samples":len(rows),"results":rows,"dialogsum":dialogsum_status}
