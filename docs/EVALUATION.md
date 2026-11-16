# Evaluation protocol

`eval/run_eval.py` evaluates against independent hand-authored annotations. Run `make eval` to write CSV, Markdown, and a PNG chart using only the Python standard library for chart rendering.

The harness reports measured BM25 retrieval and rules-based decision detection. BART/T5/DialogSum, span-level NER, live Ollama QA/citation, dense retrieval, and action rules-versus-LLM comparisons are marked “not run” when their model/runtime requirements are absent. No gold-self-comparison metric is reported. Model metadata and skip reasons are recorded in `eval/results/report.md`.

## Latest local run

| Metric | Result |
|---|---:|
| BM25 recall@1 | 0.086 |
| BM25 recall@3 | 0.161 |
| BM25 recall@5 | 0.246 |
| BM25 recall@10 | 0.366 |
| BM25 MRR | 0.453 |
| Rules decision precision / recall / F1 | 0.238 / 0.833 / 0.370 |
| Live QA | Not run: Recall API is not running |
| QA inventory | 43 questions (5 unanswerable) |

## Full component results

| Experiment | Result | Status / reason |
|---|---|---|
| Actions · rules P / R / F1 and assignee/deadline accuracy | — | Not run: MiniLM weights unavailable; task matching requires embedding cosine |
| Actions · LLM P / R / F1 and assignee/deadline accuracy | — | Not run: Ollama model and MiniLM unavailable |
| Decisions · rules precision / recall / F1 | 0.238 / 0.833 / 0.370 | Measured against independent annotations |
| Decisions · LLM precision / recall / F1 | — | Not run: Ollama model unavailable |
| Retrieval · BM25 recall@1 / @3 / @5 / @10, MRR | 0.086 / 0.161 / 0.246 / 0.366, MRR 0.453 | Measured on gold evidence ranges |
| Retrieval · dense MiniLM + FAISS | — | Not run: MiniLM weights unavailable |
| Retrieval · hybrid RRF recall@1 / @3 / @5 / @10, MRR | — | Not run: MiniLM weights unavailable |
| QA · answer coverage, citation precision/recall, refusal rate | — | Not run: Recall API is not running |
| NER · span P / R / F1 per label, with/without EntityRuler | — | Not run: spaCy package/model unavailable |
| Summarization · ROUGE-1/2/L for gold meetings and 100 DialogSum samples | — | Not run: transformers/torch unavailable; `datasets` is not installed |

No gold-self-comparison metric is reported. Dense and hybrid results are not substituted with BM25. The corpus has eight synthetic meetings, including one 3,235-word transcript, an implicit owner, an unassigned task, a decision reversal, and an absent participant mentioned by name. Package and hardware metadata, prompt file paths, and exact skip reasons are in [the generated report](../eval/results/report.md). The current host only ran Python 3.15; Python 3.11 and Postgres/Ollama end-to-end results remain unverified.
