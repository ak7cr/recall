"""Meeting-relative deadline parsing helpers."""
from datetime import date,datetime
def resolve_deadline(text:str|None, meeting_date:date):
    if not text:return None
    try:
        from dateparser import parse
        value=parse(text,settings={"RELATIVE_BASE":datetime.combine(meeting_date,datetime.min.time()),"PREFER_DATES_FROM":"future"})
        return value.date() if value else None
    except Exception:return None
