# Recall evaluation results

| Component | Metrics |
|---|---|
| action fixture consistency | `{"precision": 1.0, "recall": 1.0, "f1": 1.0}` |
| decision fixture consistency | `{"precision": 1.0, "recall": 1.0, "f1": 1.0}` |
| retrieval hybrid | `{"recall@1": 0.23563218390804597, "recall@3": 0.6724137931034483, "recall@5": 1.0, "recall@10": 1.0, "mrr": 0.6086206896551724}` |
| QA inventory | `{"questions": 33, "unanswerable": 4, "note": "Live answer/citation scores require Recall API and Ollama."}` |
| NER | `{"status": "optional spaCy en_core_web_lg required", "precision": "not measured", "recall": "not measured", "f1": "not measured"}` |
| summarization | `{"dialogsum": "skipped (offline-safe harness; datasets/weights not downloaded)", "gold_rouge_l": "not run without reference outputs"}` |

Fixtures are deterministic. Optional model-based metrics are marked unavailable when model assets or Ollama are absent. Fixture consistency is not a claim of extraction accuracy.
