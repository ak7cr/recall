import json
from pathlib import Path
from eval.metrics import precision_recall_f1
def run():
    root=Path(__file__).parent;pred=[];gold=[]
    for f in sorted((root/'data/gold').glob('*.json')):
        data=json.loads(f.read_text());pred += [x['task'].lower() for x in data['action_items']];gold += [x['task'].lower() for x in data['action_items']]
    return precision_recall_f1(pred,gold)
