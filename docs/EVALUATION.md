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

Action extraction is not run because MiniLM weights are unavailable and task matching requires embedding cosine. Dense and hybrid retrieval are not substituted with BM25; they are marked not run because all-MiniLM-L6-v2 is not loaded. The corpus has eight synthetic meetings, including one 3,235-word transcript, an implicit owner, an unassigned task, a decision reversal, and an absent participant mentioned by name. Summarization, NER, live QA, and LLM decision extraction are not run because their local model runtimes are unavailable.
