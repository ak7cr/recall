def verify(used_sources, source_map):
    return [source_map[k]["citation"] for k in used_sources if k in source_map]
