import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base,engine
from .config import settings
from .api import meetings,actions,decisions,chat,search,dashboard
from .models import Meeting
logging.basicConfig(level=getattr(logging,settings.log_level.upper(),logging.INFO),format="%(asctime)s %(levelname)s %(name)s %(message)s")
Base.metadata.create_all(bind=engine)
app=FastAPI(title="Recall Meeting Intelligence",version="0.1.0",description="Local-first conversational meeting intelligence with evidence citations")
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:5173"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
for r in [meetings.router,actions.router,decisions.router,chat.router,search.router,dashboard.router]:app.include_router(r,prefix="/api")
@app.get("/api/health")
def health():
    try:db=engine.connect();db.close();db_status="ok"
    except Exception as e:db_status=f"error: {e}"
    from .llm.ollama_client import client
    from .knowledge.embeddings import loaded as embedding_loaded
    from .nlp.summarize import loaded_models
    from .nlp import ner
    import importlib.util
    spacy_model=False
    if importlib.util.find_spec("spacy"):
        try:
            import spacy
            spacy_model=spacy.util.is_package("en_core_web_lg")
        except Exception:pass
    ollama=client.status()
    loaded=loaded_models()
    return {"status":"ok" if db_status=="ok" else "degraded","database":db_status,"ollama":{"reachable":ollama["reachable"],"model":settings.ollama_model,"model_present":ollama["model_present"]},"spacy_en_core_web_lg":{"installed":spacy_model,"loaded":ner.loaded()},"minilm":{"model":settings.embedding_model,"loaded":embedding_loaded()},"bart":{"model":"facebook/bart-large-cnn","loaded":"bart" in loaded},"t5":{"model":"google/flan-t5-base","loaded":"t5" in loaded}}
