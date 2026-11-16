# Recall specification gap analysis

Compared against the complete user-provided spec in [RECALL_SPEC.md](../RECALL_SPEC.md). “Done” means implementation exists and the available local checks passed; “partial” means some implementation exists but required behavior or target-runtime verification is missing. “Missing” means no implementation was found.

| Requirement | Status | File(s) |
|---|---|---|
| Sections 1–3: local-only stack, repo structure | done | `backend/`, `frontend/`, `docker-compose.yml` |
| Section 4: schema, UUID keys, migrations | partial | `backend/app/models.py`, `backend/alembic/`; SQLite was exercised, PostgreSQL migration/connectivity was not |
| Section 5.1: TXT/DOCX/PDF, timestamps, evidence | partial | `backend/app/ingestion/`; parser formats and DOCX/PDF/TXT paths have tests; VTT/SRT integration and real PDFs need more coverage |
| Section 5.2: overlapping chunks | partial | `backend/app/ingestion/chunker.py`; standard cases covered, boundary/overlap matrix incomplete |
| Section 5.3: BART/T5/LLM map-reduce summaries | partial | `backend/app/nlp/summarize.py`; runtime/model comparisons not run |
| Section 5.4: NER, EntityRuler, KeyBERT | partial | `backend/app/nlp/ner.py`, `topics.py`; model-based extraction and per-label evaluation not run |
| Section 5.5: rules/LLM actions, dates, validation, dedupe | partial | `backend/app/nlp/actions.py`; unit/integration paths exist, independent action score and LLM comparison not run |
| Section 5.6: decisions and supersession | partial | `backend/app/nlp/decisions.py`, `knowledge/supersession.py`, `pipeline.py`; rules decision metric measured; LLM/supersession model path not run |
| Section 5.7: FAISS, BM25, RRF | partial | `backend/app/knowledge/`; BM25 measured and fusion/mode behavior tested; real MiniLM/FAISS retrieval and metrics not run |
| Section 6: RAG, SQL, history, citations, refusal | partial | `backend/app/rag/`, `backend/app/api/chat.py`; citation/refusal code paths have unit tests, live QA on the six demo questions and 43-question gold set not run |
| Section 7: REST endpoints and filters | partial | `backend/app/api/`; main routes are covered by a mocked integration smoke test; PostgreSQL/live service behavior and all filter edges are not verified |
| Section 8: dashboard, upload, workspace, chat, tracker, compare | partial | `frontend/src/ui.tsx`; six Vitest page smoke tests pass, including a citation deep-link; full browser interaction/E2E is not run |
| Section 9: independent gold and model evaluation | partial | `eval/`; self-comparison removed; BM25 and rules decisions measured; remaining experiments not run for missing runtime/assets |
| Section 10: demo corpus and questions | done | `sample_data/`, `eval/data/`; 8 annotated meetings, 43 QA questions (5 unanswerable), and a 3,235-word transcript |
| Section 11: setup, docs, tests, performance | partial | `Makefile`, `README.md`, `docs/`; instructions/check targets exist; Python 3.11/Postgres/Ollama/performance cannot be verified on this host |
| Section 12: phased implementation | partial | Workspace contains the core vertical slices; model-backed and target-stack completion remains |
| Section 13: acceptance criteria | partial | `backend/tests/`, `frontend/src/`; SQLite/fake-LLM suite passes; target-machine end-to-end checks remain |

The latest measurable results and explicit skip reasons are in [EVALUATION.md](EVALUATION.md) and generated [eval/results/report.md](../eval/results/report.md). The result set contains no gold-self-comparison scores.
