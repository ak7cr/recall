import re
from dataclasses import dataclass
from datetime import timedelta
@dataclass
class ParsedUtterance:
    idx:int; speaker:str; text:str; start_ts:float|None=None; end_ts:float|None=None
TIMESTAMP=r"(?:\[(\d{1,2}:\d{2}:\d{2})\]\s*)?"
PATTERNS=[re.compile(r"^"+TIMESTAMP+r"([^:]{1,80}):\s*(.*)$"),re.compile(r"^([^:(]{1,80})\s+\((\d{1,2}:\d{2}:\d{2})\):\s*(.*)$"),re.compile(r"^(\d{1,2}:\d{2}:\d{2})\s+([^:]{1,80}):\s*(.*)$")]
def seconds(s):
    try: return sum(int(v)*m for v,m in zip(s.split(":"),(3600,60,1)))
    except Exception: return None
def parse_transcript(raw):
    lines=raw.replace("\r","").splitlines(); result=[];paragraph_break=False
    for line in lines:
        line=line.strip()
        if not line:paragraph_break=True;continue
        if re.fullmatch(r"(?:WEBVTT|\d+|\d{2}:\d{2}:\d{2}[,.]\d{3} --> .*)",line):continue
        found=None
        m=PATTERNS[1].match(line)
        if m: found=(m.group(1),m.group(3),seconds(m.group(2)))
        if not found:
            m=PATTERNS[2].match(line)
            if m: found=(m.group(2),m.group(3),seconds(m.group(1)))
        if not found:
            m=PATTERNS[0].match(line)
            if m and not (m.group(2).strip().lower() in {"http","https"}): found=(m.group(2),m.group(3),seconds(m.group(1)) if m.group(1) else None)
        if found:
            name,text,ts=found; key=" ".join(name.strip().split()).title()
            result.append(ParsedUtterance(len(result)+1,key,text.strip(),ts,None))
        elif result and paragraph_break:result.append(ParsedUtterance(len(result)+1,"Unknown",line))
        elif result: result[-1].text += " "+line
        else: result.append(ParsedUtterance(1,"Unknown",line))
        paragraph_break=False
    return [ParsedUtterance(i+1,u.speaker,u.text,u.start_ts,u.end_ts) for i,u in enumerate(result) if u.text]
