import os
from pathlib import Path
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[2]/".env")
except ImportError: pass
class Settings:
    database_url=os.getenv("DATABASE_URL","postgresql+psycopg://recall:recall@localhost:5432/recall")
    ollama_base_url=os.getenv("OLLAMA_BASE_URL","http://localhost:11434")
    ollama_model=os.getenv("OLLAMA_MODEL","qwen2.5:7b-instruct")
    run_baselines=os.getenv("RUN_BASELINE_SUMMARIZERS","false").lower()=="true"
    supersession=os.getenv("SUPERSESSION","true").lower()=="true"
    max_upload_mb=int(os.getenv("MAX_UPLOAD_MB","10"))
    faiss_path=Path(os.getenv("FAISS_PATH","../data/faiss.index"))
settings=Settings()
