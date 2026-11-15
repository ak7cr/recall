_model=None
def encode(texts):
    global _model
    try:
        from sentence_transformers import SentenceTransformer
        from ..config import settings
        if _model is None: _model=SentenceTransformer(settings.embedding_model,device="mps" if __import__("torch").backends.mps.is_available() else "cpu")
        return _model.encode(texts,normalize_embeddings=True)
    except Exception: return None
