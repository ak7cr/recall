import logging
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base,engine
from .config import settings
from .api import meetings,actions,decisions,chat,search,dashboard
from .models import Meeting
logging.basicConfig(level=logging.INFO,format="%(asctime)s %(levelname)s %(name)s %(message)s")
Base.metadata.create_all(bind=engine)
app=FastAPI(title="Recall Meeting Intelligence",version="0.1.0",description="Local-first conversational meeting intelligence with evidence citations")
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:5173"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
for r in [meetings.router,actions.router,decisions.router,chat.router,search.router,dashboard.router]:app.include_router(r,prefix="/api")
@app.get("/api/health")
def health():
    try:db=engine.connect();db.close();db_status="ok"
    except Exception as e:db_status=f"error: {e}"
    try:r=httpx.get(settings.ollama_base_url+"/api/tags",timeout=2);ollama="ok" if r.is_success else "unavailable"
    except Exception:ollama="unavailable"
    return {"status":"ok" if db_status=="ok" else "degraded","database":db_status,"ollama":ollama,"model":settings.ollama_model,"spacy_model":"available" if __import__("importlib").util.find_spec("spacy") else "not installed","embeddings":"optional"}
