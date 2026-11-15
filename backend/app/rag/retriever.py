def documents(db):
    from ..models import Meeting, MeetingChunk, ActionItem, Decision
    docs=[]
    for m in db.query(Meeting).filter(Meeting.status=="ready"):
        for c in db.query(MeetingChunk).filter_by(meeting_id=m.id): docs.append(dict(id=c.id,meeting_id=m.id,title=m.title,date=m.meeting_date,text=c.content,start=c.utterance_start_idx,end=c.utterance_end_idx,type="meeting"))
        for a in db.query(ActionItem).filter_by(meeting_id=m.id): docs.append(dict(id=a.id,meeting_id=m.id,title=m.title,date=m.meeting_date,text=f"Action item: {a.task}. Assignee: {a.assignee}. Deadline: {a.deadline_text}. Evidence: {a.evidence_quote}",start=a.evidence_utterance_idx,end=a.evidence_utterance_idx,type="action"))
        for d in db.query(Decision).filter_by(meeting_id=m.id): docs.append(dict(id=d.id,meeting_id=m.id,title=m.title,date=m.meeting_date,text=f"Decision: {d.decision}. Topic: {d.topic}. Evidence: {d.evidence_quote}",start=d.evidence_utterance_idx,end=d.evidence_utterance_idx,type="decision"))
    return docs
