def rewrite(question, history, llm):
    if not history:return question
    try:return llm.generate("Rewrite the follow-up as a standalone meeting-history question. Return only the question.\nHistory:\n"+"\n".join(history[-6:])+"\nQuestion: "+question,temperature=0)
    except Exception:return question
