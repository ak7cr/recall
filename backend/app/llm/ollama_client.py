import httpx, json
from .client import LLMClient
from ..config import settings
class OllamaClient:
    def generate(self,prompt,*,temperature=0.0,json_mode=False):
        r=httpx.post(settings.ollama_base_url+"/api/generate",json={"model":settings.ollama_model,"prompt":prompt,"stream":False,"format":"json" if json_mode else "","options":{"temperature":temperature}},timeout=8); r.raise_for_status(); return r.json()["response"]
client=OllamaClient()
