"""Preflight local services, migrate/seed, and check demo questions through HTTP."""
from __future__ import annotations
import subprocess,sys
from pathlib import Path
import httpx
from sqlalchemy import create_engine,text
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"backend"))
from app.config import settings

QUESTIONS=[
    ("What did we decide about the backend architecture?",("PostgreSQL",)),
    ("Who was assigned the authentication module?",("Rahul",)),
    ("What tasks are still pending?",("authentication","API","testing")),
    ("Did we discuss the database migration in the previous meeting?",("migration","PostgreSQL")),
    ("What changed between the first and third meetings?",("rehearsal","delay","schema")),
    ("What happened with our database migration?",("PostgreSQL","schema","migration")),
]
def main()->int:
    failures=[]
    if sys.version_info[:2]!=(3,11):failures.append(f"Python 3.11 required; running {sys.version.split()[0]}")
    try:
        engine=create_engine(settings.database_url)
        if engine.dialect.name!="postgresql":raise RuntimeError("DATABASE_URL must point to PostgreSQL for verification")
        with engine.connect() as conn:conn.execute(text("SELECT 1"))
        print("PASS PostgreSQL connectivity")
    except Exception as exc:failures.append(f"PostgreSQL connectivity: {exc}")
    try:
        status=httpx.get(settings.ollama_base_url+"/api/tags",timeout=3).json()
        names=[x.get("name","") for x in status.get("models",[])]
        if not any(n==settings.ollama_model or n.startswith(settings.ollama_model+":") for n in names):raise RuntimeError(f"model {settings.ollama_model} is not present; run ollama pull {settings.ollama_model}")
        print(f"PASS Ollama model {settings.ollama_model}")
    except Exception as exc:failures.append(f"Ollama/model check: {exc}")
    if failures:
        for item in failures:print("FAIL "+item)
        return 1
    subprocess.run([sys.executable,"-m","alembic","upgrade","head"],cwd="backend",check=True)
    try:subprocess.run([sys.executable,"scripts/seed.py"],check=True)
    except subprocess.CalledProcessError as exc:print(f"FAIL demo seed: {exc}");return 1
    with httpx.Client(base_url="http://localhost:8000/api",timeout=180) as client:
        failed=False
        for question,keywords in QUESTIONS:
            try:
                result=client.post("/chat",json={"question":question}).json();answer=result.get("answer","");citations=result.get("citations",[])
                ok=bool(citations) and any(k.lower() in answer.lower() for k in keywords)
                label="PASS" if ok else "FAIL"
                print(f"{label} {question}\n  Answer: {answer}\n  Citations: {citations}")
                failed |= not ok
            except Exception as exc:print(f"FAIL {question}: {exc}");failed=True
    return 1 if failed else 0
if __name__=="__main__":raise SystemExit(main())
