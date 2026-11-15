from pathlib import Path
from io import BytesIO
def extract_text(filename, data):
    suffix=Path(filename).suffix.lower()
    if suffix in {".txt",".vtt",".srt"}: return data.decode("utf-8-sig",errors="replace")
    if suffix==".pdf":
        from pypdf import PdfReader
        return "\n".join(p.extract_text() or "" for p in PdfReader(BytesIO(data)).pages)
    if suffix==".docx":
        from docx import Document
        return "\n".join(p.text for p in Document(BytesIO(data)).paragraphs)
    raise ValueError("Supported formats: .txt, .docx, .pdf, .vtt, .srt")
