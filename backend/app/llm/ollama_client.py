import httpx, json
from .client import LLMClient
from ..config import settings
class OllamaClient:
    def status(self):
        try:
            r=httpx.get(settings.ollama_base_url+"/api/tags",timeout=2);r.raise_for_status()
            names=[x.get("name","") for x in r.json().get("models",[])]
            present=any(n==settings.ollama_model or n.startswith(settings.ollama_model+":") for n in names)
            return {"reachable":True,"model_present":present,"models":names}
        except Exception:return {"reachable":False,"model_present":False,"models":[]}
    def generate(self,prompt,*,temperature=0.0,json_mode=False):
        payload={"model":settings.ollama_model,"prompt":prompt,"stream":False,"options":{"temperature":temperature}}
        if json_mode:payload["format"]="json"
        r=httpx.post(settings.ollama_base_url+"/api/generate",json=payload,timeout=8); r.raise_for_status(); return r.json()["response"]
client=OllamaClient()
