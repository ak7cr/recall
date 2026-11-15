import uuid
from datetime import datetime, date
from sqlalchemy import String, Text, Date, DateTime, Boolean, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base
def uid(): return str(uuid.uuid4())
class Meeting(Base):
    __tablename__="meetings"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); title:Mapped[str]=mapped_column(String(300)); meeting_date:Mapped[date]=mapped_column(Date); source_filename:Mapped[str|None]=mapped_column(String(500)); raw_text:Mapped[str]=mapped_column(Text); status:Mapped[str]=mapped_column(String(20),default="uploaded",index=True); error_message:Mapped[str|None]=mapped_column(Text); duration_seconds:Mapped[float|None]=mapped_column(Float); processing_metadata:Mapped[dict|None]=mapped_column(JSON); created_at:Mapped[datetime]=mapped_column(DateTime,default=datetime.utcnow)
class Participant(Base):
    __tablename__="participants"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); meeting_id:Mapped[str]=mapped_column(ForeignKey("meetings.id",ondelete="CASCADE"),index=True); speaker_name:Mapped[str]=mapped_column(String(200)); utterance_count:Mapped[int]=mapped_column(Integer,default=0); word_count:Mapped[int]=mapped_column(Integer,default=0)
class Utterance(Base):
    __tablename__="utterances"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); meeting_id:Mapped[str]=mapped_column(ForeignKey("meetings.id",ondelete="CASCADE"),index=True); idx:Mapped[int]=mapped_column(Integer); speaker:Mapped[str]=mapped_column(String(200)); text:Mapped[str]=mapped_column(Text); start_ts:Mapped[float|None]=mapped_column(Float); end_ts:Mapped[float|None]=mapped_column(Float)
class Summary(Base):
    __tablename__="summaries"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); meeting_id:Mapped[str]=mapped_column(ForeignKey("meetings.id",ondelete="CASCADE"),index=True); method:Mapped[str]=mapped_column(String(20)); summary_text:Mapped[str]=mapped_column(Text); is_primary:Mapped[bool]=mapped_column(Boolean,default=False); created_at:Mapped[datetime]=mapped_column(DateTime,default=datetime.utcnow)
class Topic(Base):
    __tablename__="topics"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); meeting_id:Mapped[str]=mapped_column(ForeignKey("meetings.id",ondelete="CASCADE"),index=True); topic:Mapped[str]=mapped_column(String(300)); score:Mapped[float]=mapped_column(Float,default=0)
class Entity(Base):
    __tablename__="entities"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); meeting_id:Mapped[str]=mapped_column(ForeignKey("meetings.id",ondelete="CASCADE"),index=True); text:Mapped[str]=mapped_column(String(300)); label:Mapped[str]=mapped_column(String(40)); utterance_idx:Mapped[int]=mapped_column(Integer)
class ActionItem(Base):
    __tablename__="action_items"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); meeting_id:Mapped[str]=mapped_column(ForeignKey("meetings.id",ondelete="CASCADE"),index=True); task:Mapped[str]=mapped_column(Text); assignee:Mapped[str|None]=mapped_column(String(200)); deadline_text:Mapped[str|None]=mapped_column(String(200)); deadline_date:Mapped[date|None]=mapped_column(Date,index=True); status:Mapped[str]=mapped_column(String(20),default="pending",index=True); assignee_explicit:Mapped[bool]=mapped_column(Boolean,default=False); deadline_explicit:Mapped[bool]=mapped_column(Boolean,default=False); confidence:Mapped[float]=mapped_column(Float,default=.5); evidence_utterance_idx:Mapped[int]=mapped_column(Integer); evidence_quote:Mapped[str]=mapped_column(Text); extraction_method:Mapped[str]=mapped_column(String(20),default="rules"); created_at:Mapped[datetime]=mapped_column(DateTime,default=datetime.utcnow); updated_at:Mapped[datetime]=mapped_column(DateTime,default=datetime.utcnow)
class Decision(Base):
    __tablename__="decisions"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); meeting_id:Mapped[str]=mapped_column(ForeignKey("meetings.id",ondelete="CASCADE"),index=True); decision:Mapped[str]=mapped_column(Text); topic:Mapped[str|None]=mapped_column(String(300)); evidence_utterance_idx:Mapped[int]=mapped_column(Integer); evidence_quote:Mapped[str]=mapped_column(Text); status:Mapped[str]=mapped_column(String(20),default="active",index=True); superseded_by_id:Mapped[str|None]=mapped_column(ForeignKey("decisions.id")); extraction_method:Mapped[str]=mapped_column(String(20),default="rules"); created_at:Mapped[datetime]=mapped_column(DateTime,default=datetime.utcnow)
class MeetingChunk(Base):
    __tablename__="meeting_chunks"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); meeting_id:Mapped[str]=mapped_column(ForeignKey("meetings.id",ondelete="CASCADE"),index=True); chunk_index:Mapped[int]=mapped_column(Integer); content:Mapped[str]=mapped_column(Text); utterance_start_idx:Mapped[int]=mapped_column(Integer); utterance_end_idx:Mapped[int]=mapped_column(Integer); vector_id:Mapped[int|None]=mapped_column(Integer)
class VectorDoc(Base):
    __tablename__="vector_docs"
    vector_id:Mapped[int]=mapped_column(Integer,primary_key=True); doc_type:Mapped[str]=mapped_column(String(20)); ref_id:Mapped[str]=mapped_column(String(36)); meeting_id:Mapped[str]=mapped_column(ForeignKey("meetings.id",ondelete="CASCADE"),index=True)
class Conversation(Base):
    __tablename__="conversations"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); title:Mapped[str]=mapped_column(String(300),default="New conversation"); meeting_filter:Mapped[dict|None]=mapped_column(JSON); created_at:Mapped[datetime]=mapped_column(DateTime,default=datetime.utcnow)
class Message(Base):
    __tablename__="messages"
    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); conversation_id:Mapped[str]=mapped_column(ForeignKey("conversations.id",ondelete="CASCADE"),index=True); role:Mapped[str]=mapped_column(String(20)); content:Mapped[str]=mapped_column(Text); citations:Mapped[dict|None]=mapped_column(JSON); created_at:Mapped[datetime]=mapped_column(DateTime,default=datetime.utcnow)
