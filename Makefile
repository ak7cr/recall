.PHONY: setup db db-up migrate models backend frontend eval test lint seed
setup:
	python3.11 -m venv backend/.venv
	backend/.venv/bin/pip install -e 'backend/[nlp,test]'
	cd frontend && npm install
	backend/.venv/bin/python -m spacy download en_core_web_lg || true
db:
	docker compose up -d db
db-up: db
migrate:
	cd backend && ../backend/.venv/bin/alembic upgrade head
models:
	backend/.venv/bin/python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
	ollama pull qwen2.5:7b-instruct
backend:
	cd backend && ../backend/.venv/bin/uvicorn app.main:app --reload
frontend:
	cd frontend && npm run dev
eval:
	python3 -m eval.run_eval
test:
	cd backend && DATABASE_URL=sqlite:///./test.db ../backend/.venv/bin/pytest
	cd frontend && npm test
lint:
	python3 -m compileall -q backend/app backend/tests eval
seed:
	python3 scripts/seed.py
