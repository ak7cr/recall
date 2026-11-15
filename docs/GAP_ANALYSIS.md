# Recall specification gap analysis

Assessment against [RECALL_SPEC.md](../RECALL_SPEC.md). “Done” means implemented and locally verified; “partial” means code exists but the complete behavior or requested verification is missing.

| Requirement | Status | File(s) |
|---|---|---|
| Sections 1–3: local-only stack, repo layout | partial | `backend/`, `frontend/`, `docs/`; target services not verified |
| Section 4: schema, UUID keys, migration | partial | `backend/app/models.py`, `backend/alembic/`; some DB columns/types and PostgreSQL migration path need validation |
| Section 5.1: TXT/DOCX/PDF, timestamp formats, evidence text | partial | `backend/app/ingestion/`; timestamp formats/parser are tested; upload file types lack integration coverage |
| Section 5.2: overlapping chunks | partial | `backend/app/ingestion/chunker.py`; overlap and size-boundary behavior needs stronger tests |
| Section 5.3: three map-reduce summarizers | partial | `backend/app/nlp/summarize.py`; local models/downloads and long-input behavior not evaluated |
| Section 5.4: NER + EntityRuler, KeyBERT | partial | `backend/app/nlp/ner.py`, `topics.py`; assets and per-label metrics unavailable |
| Section 5.5: rules/LLM actions, validation, dates, dedupe | partial | `backend/app/nlp/actions.py`; windows/retry and measured rules-vs-LLM behavior missing |
| Section 5.6: decisions and supersession | partial | `backend/app/nlp/decisions.py`, `knowledge/supersession.py`, `pipeline.py`; integrated but embedding/LLM path not run |
| Section 5.7: FAISS, BM25, RRF | partial | `backend/app/knowledge/`; BM25/dense/RRF modes and caps are tested; MiniLM/FAISS assets not loaded |
| Section 6: RAG, history, structured SQL, citations/refusal | partial | `backend/app/rag/`, `backend/app/api/chat.py`; live end-to-end QA/citation evaluation missing |
| Section 7: REST API routes | partial | `backend/app/api/`; main routes have an integration smoke test; filter edges need more coverage |
| Section 8: Dashboard, upload, meetings, workspace, chat, tracker, compare | partial | `frontend/src/ui.tsx`; five page smoke tests, kanban drag/drop and compare detail exist; browser behavior not E2E-tested |
| Section 9: independent gold and model evaluation | partial | `eval/`; self-comparison scores removed; BM25/rule-decision measured; model-required components explicitly not run |
| Section 10: demo meetings and questions | partial | `sample_data/`, `eval/data/`; 8 gold meetings including 3,235-word input; live demo answers not verified |
| Section 11: commands, docs, tests, performance | partial | `Makefile`, docs, tests; Python 3.11, Postgres, model downloads and performance unverified |
| Section 12: phased implementation | partial | Workspace contains scaffold and vertical slices; all phases are not complete |
| Section 13: acceptance criteria | partial | `backend/tests/`, `frontend/src/`; SQLite/fake-LLM tests pass; target-machine end-to-end checks remain |

The evaluation report marks unavailable model experiments “not run”, excludes gold-self-comparisons, and records actual BM25 and rules-based decision scores.
