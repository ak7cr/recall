import os
from pathlib import Path
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[2]/".env")
except ImportError: pass
class Settings:
    root=Path(__file__).resolve().parents[2]
    database_url=os.getenv("DATABASE_URL","postgresql+psycopg://recall:recall@localhost:5432/recall")
    ollama_base_url=os.getenv("OLLAMA_BASE_URL",os.getenv("OLLAMA_URL","http://localhost:11434"))
    ollama_model=os.getenv("OLLAMA_MODEL","qwen2.5:7b-instruct")
    embedding_model=os.getenv("EMBEDDING_MODEL","all-MiniLM-L6-v2")
    data_dir=Path(os.getenv("DATA_DIR",str(root/"data"))).expanduser()
    log_level=os.getenv("LOG_LEVEL","INFO")
    run_baselines=os.getenv("RUN_BASELINE_SUMMARIZERS","false").lower()=="true"
    supersession=os.getenv("SUPERSESSION","true").lower()=="true"
    max_upload_mb=int(os.getenv("MAX_UPLOAD_MB","10"))
    faiss_path=Path(os.getenv("FAISS_PATH",str(data_dir/"faiss.index"))).expanduser()
    if not faiss_path.is_absolute():faiss_path=root/faiss_path
settings=Settings()
