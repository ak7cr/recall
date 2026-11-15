# Evaluation protocol

`eval/run_eval.py` is a deterministic baseline harness over the bundled examples. It reports action-item evidence precision/recall/F1 and retrieval hit rate; metric helpers also expose ROUGE-L and entity/action overlap primitives. Add transcript files under `eval/data/meetings`, matching annotations in `eval/data/gold`, and QA rows in `qa_gold.json`.

For academic comparisons, record model, prompt, dependency versions, hardware, and whether each optional model loaded. Compare rule vs LLM extraction with exact/normalized matching; report evidence validity separately. Retrieval reports hit@k and reciprocal rank. Summarization should be assessed with ROUGE-L plus human factuality review. Results are written as CSV and Markdown under `eval/results`.

The current harness reports fixture consistency and lexical retrieval only. BART/T5/DialogSum, span-level NER, live Ollama QA/citation, dense retrieval, and rules-versus-LLM comparisons are not measured without their model/runtime requirements. Fixture consistency is not a claim of model accuracy. The QA fixture contains 33 questions, including four unanswerable prompts.
