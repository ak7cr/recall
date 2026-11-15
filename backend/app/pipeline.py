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
        for model in [Utterance,Participant,Summary,Topic,Entity,ActionItem,Decision,MeetingChunk,VectorDoc]:
            db.query(model).filter_by(meeting_id=meeting_id).delete(synchronize_session=False)
        db.commit()
        utterances=parse_transcript(meeting.raw_text)
        for u in utterances: db.add(Utterance(meeting_id=meeting_id,idx=u.idx,speaker=u.speaker,text=u.text,start_ts=u.start_ts,end_ts=u.end_ts))
        grouped={}
        for u in utterances: grouped.setdefault(u.speaker,[]).append(u)
        for name,us in grouped.items(): db.add(Participant(meeting_id=meeting_id,speaker_name=name,utterance_count=len(us),word_count=sum(len(u.text.split()) for u in us)))
        db.commit()
        def stage(name, fn):
            try: fn()
            except Exception: log.exception("Meeting %s stage %s failed",meeting_id,name); db.rollback()
        def do_summary():
            text=summarize.summarize(type("M",(),{"utterances":utterances})(),"llm")
            db.add(Summary(meeting_id=meeting_id,method="llm",summary_text=text,is_primary=True))
            from .config import settings
            if settings.run_baselines:
                for method in ("bart","t5"):
                    try:db.add(Summary(meeting_id=meeting_id,method=method,summary_text=summarize.summarize(type("M",(),{"utterances":utterances})(),method),is_primary=False))
                    except Exception:log.exception("Optional %s summarizer failed",method)
        stage("summary",do_summary)
        def do_ner():
            for text,label,idx in ner.extract(utterances): db.add(Entity(meeting_id=meeting_id,text=text,label=label,utterance_idx=idx))
        stage("ner",do_ner)
        def do_topics():
            for topic,score in topics.extract(" ".join(u.text for u in utterances)): db.add(Topic(meeting_id=meeting_id,topic=topic,score=float(score)))
        stage("topics",do_topics)
        names=list(grouped)
        def do_actions():
            for row in actions.extract(utterances,meeting.meeting_date,names,method="llm"): db.add(ActionItem(meeting_id=meeting_id,**row))
        stage("actions",do_actions)
        def do_decisions():
            for row in decisions.extract(utterances,method="llm"): db.add(Decision(meeting_id=meeting_id,**row))
        stage("decisions",do_decisions)
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
            rebuild(db)
        except Exception:log.exception("Vector index refresh failed")
        meeting.status="ready"; db.commit()
    except Exception as e:
        log.exception("Meeting processing failed"); db.rollback()
        meeting=db.get(Meeting,meeting_id)
        if meeting: meeting.status="failed"; meeting.error_message=str(e); db.commit()
    finally: db.close()
