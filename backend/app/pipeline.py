import logging
from datetime import date
from .db import SessionLocal
from .models import Meeting, Utterance, Participant, Summary, Topic, Entity, ActionItem, Decision, MeetingChunk, VectorDoc
from .ingestion.transcript_parser import parse_transcript
from .ingestion.chunker import chunk_utterances
from .nlp import summarize, ner, topics, actions, decisions
log=logging.getLogger(__name__)
def process_meeting(meeting_id):
    db=SessionLocal()
    try:
        meeting=db.get(Meeting,meeting_id)
        if not meeting:return
        meeting.status="processing"; db.commit()
        from .config import settings
        from .llm.ollama_client import client
        runtime=client.status()
        meeting.processing_metadata={"ollama":{"reachable":runtime['reachable'],"model":settings.ollama_model,"model_present":runtime['model_present']}}
        for model in [Utterance,Participant,Summary,Topic,Entity,ActionItem,Decision,MeetingChunk,VectorDoc]:
            db.query(model).filter_by(meeting_id=meeting_id).delete(synchronize_session=False)
        db.commit()
        utterances=parse_transcript(meeting.raw_text)
        for u in utterances: db.add(Utterance(meeting_id=meeting_id,idx=u.idx,speaker=u.speaker,text=u.text,start_ts=u.start_ts,end_ts=u.end_ts))
        grouped={}
        for u in utterances: grouped.setdefault(u.speaker,[]).append(u)
        for name,us in grouped.items(): db.add(Participant(meeting_id=meeting_id,speaker_name=name,utterance_count=len(us),word_count=sum(len(u.text.split()) for u in us)))
        db.commit()
        def stage(name, fn, method):
            try:
                fn();row=db.get(Meeting,meeting_id);row.processing_metadata={**(row.processing_metadata or {}),name:{"status":"complete","method":method()}};db.commit()
            except Exception as exc:
                log.exception("Meeting %s stage %s failed",meeting_id,name); db.rollback()
                row=db.get(Meeting,meeting_id);row.processing_metadata={**(row.processing_metadata or {}),name:{"status":"failed","error":str(exc)}};db.commit()
        def do_summary():
            text=summarize.summarize(type("M",(),{"utterances":utterances})(),"llm")
            db.add(Summary(meeting_id=meeting_id,method="llm",summary_text=text,is_primary=True))
            from .config import settings
            if settings.run_baselines:
                for method in ("bart","t5"):
                    try:db.add(Summary(meeting_id=meeting_id,method=method,summary_text=summarize.summarize(type("M",(),{"utterances":utterances})(),method),is_primary=False))
                    except Exception:log.exception("Optional %s summarizer failed",method)
        stage("summary",do_summary,lambda:"llm" if db.query(Summary).filter_by(meeting_id=meeting_id,method="llm").first() and not db.query(Summary).filter_by(meeting_id=meeting_id,method="llm").first().summary_text.startswith("Summary unavailable") else "unavailable")
        def do_ner():
            for text,label,idx in ner.extract(utterances): db.add(Entity(meeting_id=meeting_id,text=text,label=label,utterance_idx=idx))
        stage("ner",do_ner,ner.last_method)
        def do_topics():
            for topic,score in topics.extract(" ".join(u.text for u in utterances)): db.add(Topic(meeting_id=meeting_id,topic=topic,score=float(score)))
        stage("topics",do_topics,topics.last_method)
        names=list(grouped)
        def do_actions():
            for row in actions.extract(utterances,meeting.meeting_date,names,method="llm"): db.add(ActionItem(meeting_id=meeting_id,**row))
        stage("actions",do_actions,lambda:sorted({x.extraction_method for x in db.query(ActionItem).filter_by(meeting_id=meeting_id)}) or ["llm_and_rules_no_items"])
        def do_decisions():
            for row in decisions.extract(utterances,method="llm"): db.add(Decision(meeting_id=meeting_id,**row))
        stage("decisions",do_decisions,lambda:sorted({x.extraction_method for x in db.query(Decision).filter_by(meeting_id=meeting_id)}) or ["llm_and_rules_no_items"])
        def do_supersession():
            if not settings.supersession:return
            from .knowledge.embeddings import encode
            from .llm.ollama_client import client
            import json
            db.flush()
            current=db.query(Decision).filter_by(meeting_id=meeting_id).all()
            prior=db.query(Decision).join(Meeting,Decision.meeting_id==Meeting.id).filter(Meeting.meeting_date<meeting.meeting_date,Decision.status=="active").all()
            for new in current:
                for old in prior:
                    vectors=encode([old.decision,new.decision])
                    if vectors is None or float(vectors[0]@vectors[1])<=.6:continue
                    result=json.loads(client.generate(f'Return JSON {{"relationship":"supersedes|consistent|unrelated","reason":"..."}}. Earlier decision: {old.decision}\nNew decision: {new.decision}',json_mode=True))
                    if result.get("relationship")=="supersedes":old.status="superseded";old.superseded_by_id=new.id
        stage("supersession",do_supersession,lambda:"embedding_filtered_llm" if settings.supersession else "disabled")
        for index,(start,end,content) in enumerate(chunk_utterances(utterances)):
            db.add(MeetingChunk(meeting_id=meeting_id,chunk_index=index,content=content,utterance_start_idx=start,utterance_end_idx=end))
        db.flush()
        from sqlalchemy import func
        vector_id=(db.query(func.max(VectorDoc.vector_id)).scalar() or 0)+1
        docs=[]
        for row in db.query(MeetingChunk).filter_by(meeting_id=meeting_id):
            row.vector_id=vector_id;docs.append(VectorDoc(vector_id=vector_id,doc_type="chunk",ref_id=row.id,meeting_id=meeting_id));vector_id+=1
        for row in db.query(ActionItem).filter_by(meeting_id=meeting_id):
            docs.append(VectorDoc(vector_id=vector_id,doc_type="action",ref_id=row.id,meeting_id=meeting_id));vector_id+=1
        for row in db.query(Decision).filter_by(meeting_id=meeting_id):
            docs.append(VectorDoc(vector_id=vector_id,doc_type="decision",ref_id=row.id,meeting_id=meeting_id));vector_id+=1
        db.add_all(docs);db.commit()
        try:
            from .knowledge.vector_index import rebuild
            vector_loaded=rebuild(db)
        except Exception:log.exception("Vector index refresh failed")
        if 'vector_loaded' not in locals():vector_loaded=False
        meeting.processing_metadata={**(meeting.processing_metadata or {}),"chunking":{"status":"complete","method":"utterance_overlap"},"indexing":{"status":"complete","faiss_loaded":vector_loaded,"lexical":"BM25 built from database documents on request"}}
        meeting.status="ready"; db.commit()
    except Exception as e:
        log.exception("Meeting processing failed"); db.rollback()
        meeting=db.get(Meeting,meeting_id)
        if meeting: meeting.status="failed"; meeting.error_message=str(e); db.commit()
    finally: db.close()
