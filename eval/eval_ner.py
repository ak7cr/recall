"""Span-level NER precision/recall/F1, with and without the technology EntityRuler."""
import json
from pathlib import Path
ROOT=Path(__file__).parent
LABELS={"PERSON","ORG","DATE","TIME","GPE","PRODUCT","EVENT","MONEY"}
def run():
    try:import spacy
    except ImportError:return {"status":"not run","reason":"spaCy package not installed"}
    if not spacy.util.is_package('en_core_web_lg'):return {"status":"not run","reason":"spaCy en_core_web_lg model not installed"}
    nlp=spacy.load('en_core_web_lg');ruler_nlp=spacy.load('en_core_web_lg');ruler=ruler_nlp.add_pipe('entity_ruler',before='ner');ruler.add_patterns([{"label":"PRODUCT","pattern":x} for x in ["PostgreSQL","MongoDB","FastAPI","React","AWS","Ollama"]])
    totals={"without_ruler":[0,0,0],"with_ruler":[0,0,0]};per_label={label:{"tp":0,"fp":0,"fn":0} for label in LABELS}
    for path in sorted((ROOT/'data/meetings').glob('*.txt')):
        gp=ROOT/'data/gold'/f'{path.stem}.json'
        if not gp.exists():continue
        gold_data=json.loads(gp.read_text());gold={(str(x['text']).casefold(),x['label']) for x in gold_data.get('entities',[]) if x.get('label') in LABELS}
        text=path.read_text()
        for key,nlp_obj in [("without_ruler",nlp),("with_ruler",ruler_nlp)]:
            pred={(e.text.casefold(),e.label_) for e in nlp_obj(text).ents if e.label_ in LABELS}
            tp=len(pred&gold);fp=len(pred-gold);fn=len(gold-pred);totals[key][0]+=tp;totals[key][1]+=fp;totals[key][2]+=fn
            if key=="with_ruler":
                for label in LABELS:
                    p={e for e in pred if e[1]==label};g={e for e in gold if e[1]==label};per_label[label]['tp']+=len(p&g);per_label[label]['fp']+=len(p-g);per_label[label]['fn']+=len(g-p)
    def metrics(values):
        tp,fp,fn=values;p=tp/max(1,tp+fp);r=tp/max(1,tp+fn);return {"precision":p,"recall":r,"f1":2*p*r/max(1e-12,p+r)}
    return {"status":"measured","without_entity_ruler":metrics(totals['without_ruler']),"with_entity_ruler":metrics(totals['with_ruler']),"with_entity_ruler_by_label":{k:metrics([v['tp'],v['fp'],v['fn']]) for k,v in per_label.items()}}
