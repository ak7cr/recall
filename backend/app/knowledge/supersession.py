def compare_prior(new_decision, prior_decisions, llm):
    # Kept as a separable stage; semantic filtering and relationship classification use the configured LLM.
    for old in prior_decisions:
        try:
            import json
            result=json.loads(llm.generate(f'Return JSON {{"relationship":"supersedes|consistent|unrelated","reason":"..."}}. Old: {old.decision}\nNew: {new_decision.decision}',json_mode=True))
            if result.get("relationship")=="supersedes": old.status="superseded"; old.superseded_by_id=new_decision.id
        except Exception: continue
