from datetime import date
from pydantic import BaseModel
class ActionPatch(BaseModel): status:str|None=None; assignee:str|None=None; deadline_date:date|None=None; task:str|None=None
class ActionCreate(BaseModel): meeting_id:str; task:str; assignee:str|None=None; deadline_date:date|None=None; deadline_text:str|None=None; evidence_utterance_idx:int=1; evidence_quote:str="Manual entry"
class ChatRequest(BaseModel): conversation_id:str|None=None; question:str; meeting_ids:list[str]|None=None
class CompareRequest(BaseModel): meeting_ids:list[str]
