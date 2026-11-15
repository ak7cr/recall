# Assumptions and scope

- The supplied request attachment was truncated at “GET /meetings (list +”; its remaining API details, UI requirements, phases, and acceptance criteria were unavailable. Implemented the fully specified requirements preceding that point and conventional CRUD/chat/dashboard endpoints.
- This is a single-user local application. No authentication is included.
- API upload processing uses FastAPI background tasks. NLP models are loaded lazily; absent model packages/assets fall back to deterministic rules or report an unavailable optional stage.
- PostgreSQL 16 is the configured default. SQLite compatibility supports tests and quick local development.
- Ollama is the only remote-like dependency and is accessed only on localhost. No transcript content leaves the machine.
- BART/T5 are optional because their weights are large; enable `RUN_BASELINE_SUMMARIZERS` for evaluation. The deterministic evaluation harness does not download model weights.
- FAISS and transformer-based features activate when their dependencies/models are installed; lexical retrieval remains available.
- Meeting date fallback is date in filename/leading text, then current local date.
