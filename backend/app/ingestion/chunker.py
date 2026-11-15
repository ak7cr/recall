def chunk_utterances(rows, target=200, maximum=300):
    chunks=[]; group=[]; count=0
    for u in rows:
        text=f"[{u.speaker}]: {u.text}"; size=len(text.split())
        if group and count+size>target:
            chunks.append((group[0].idx,group[-1].idx,"\n".join(f"[{x.speaker}]: {x.text}" for x in group)))
            overlap=group[-1]; group=[overlap]; count=len(overlap.text.split())
        group.append(u); count+=size
        if count>=maximum:
            chunks.append((group[0].idx,group[-1].idx,"\n".join(f"[{x.speaker}]: {x.text}" for x in group))); group=[]; count=0
    if group: chunks.append((group[0].idx,group[-1].idx,"\n".join(f"[{x.speaker}]: {x.text}" for x in group)))
    return chunks
