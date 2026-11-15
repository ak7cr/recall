import json
from pathlib import Path
def run():
    items=json.loads((Path(__file__).parent/'data/qa_gold.json').read_text());return {"questions":len(items),"unanswerable":sum(x.get('unanswerable',False) for x in items),"note":"Live answer/citation scores require Recall API and Ollama."}
