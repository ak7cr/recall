.PHONY: setup db db-up migrate models backend frontend eval test lint seed verify
setup:
	@python3.11 -c 'import sys; assert sys.version_info[:2] == (3, 11)' 2>/dev/null || { echo 'Python 3.11 is required. Install it with: brew install python@3.11'; exit 1; }
	python3.11 -m venv backend/.venv
	backend/.venv/bin/pip install -e 'backend/[nlp,test]'
	cd frontend && npm install
	backend/.venv/bin/python -m spacy download en_core_web_lg
db:
	docker compose up -d db
db-up: db
migrate:
	cd backend && ../backend/.venv/bin/alembic upgrade head
models:
	backend/.venv/bin/python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2'); from transformers import AutoTokenizer, AutoModelForSeq2SeqLM; [(AutoTokenizer.from_pretrained(m), AutoModelForSeq2SeqLM.from_pretrained(m)) for m in ['facebook/bart-large-cnn','google/flan-t5-base']]"
	ollama pull qwen2.5:7b-instruct
backend:
	cd backend && ../backend/.venv/bin/uvicorn app.main:app --reload
frontend:
	cd frontend && npm run dev
eval:
	backend/.venv/bin/python -m eval.run_eval
test:
	cd backend && DATABASE_URL=sqlite:///./test.db ../backend/.venv/bin/pytest
	cd frontend && npm test
lint:
	python3 -m compileall -q backend/app backend/tests eval
seed:
	backend/.venv/bin/python scripts/seed.py
verify:
	@python3.11 -c 'import sys; assert sys.version_info[:2] == (3, 11)' 2>/dev/null || { echo 'FAIL: Python 3.11 is required (brew install python@3.11).'; exit 1; }
	backend/.venv/bin/python scripts/verify.py
