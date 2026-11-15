import re, unicodedata
def clean(text, remove_fillers=False):
    text=unicodedata.normalize("NFKC",text); text=re.sub(r"\s+"," ",text).strip()
    if remove_fillers: text=re.sub(r"\b(um+|uh+|erm)\b", "",text,flags=re.I); text=re.sub(r"\s+"," ",text).strip()
    return text
