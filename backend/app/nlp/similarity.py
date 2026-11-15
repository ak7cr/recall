"""Optional MiniLM semantic similarity shared by extraction post-processing."""
def cosine_similarity(left:str,right:str)->float:
    from ..knowledge.embeddings import encode
    vectors=encode([left,right])
    if vectors is None:return 0.0
    return float(vectors[0]@vectors[1])
