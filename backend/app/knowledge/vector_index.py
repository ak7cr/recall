def rebuild(db):
    # Index is deliberately rebuildable. Dense indexing activates with optional FAISS/model dependencies.
    try:
        import faiss
        from .embeddings import encode
        from ..models import MeetingChunk,ActionItem,Decision,VectorDoc
        rows=[];texts=[];ids=[]
        for doc in db.query(VectorDoc).all():
            row=db.get({"chunk":MeetingChunk,"action":ActionItem,"decision":Decision}[doc.doc_type],doc.ref_id)
            if row is None:continue
            if doc.doc_type=="chunk":content=row.content
            elif doc.doc_type=="action":content=f"Action item: {row.task}. Assignee: {row.assignee}. Deadline: {row.deadline_text}."
            else:content=f"Decision: {row.decision}. Topic: {row.topic}."
            rows.append(row);texts.append(content);ids.append(doc.vector_id)
        vectors=encode(texts)
        if vectors is None: return False
        index=faiss.IndexIDMap(faiss.IndexFlatIP(384)); index.add_with_ids(vectors, __import__('numpy').array(ids,dtype='int64'))
        from ..config import settings
        settings.faiss_path.parent.mkdir(parents=True,exist_ok=True); faiss.write_index(index,str(settings.faiss_path));return True
    except Exception: return False
