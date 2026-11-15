# Architecture

FastAPI routes validate requests and use SQLAlchemy models. Uploads save original text and parsed utterances before scheduling the independently guarded pipeline stages (summaries, NER/topics, actions/decisions, chunks/indexing). PostgreSQL is the source of truth; vector and lexical indexes are rebuildable derived state.

Retrieval supports dense, BM25, or reciprocal-rank fusion. Chat assembles evidence sources with utterance ranges and structured action/decision fields; citations are mapped back to meeting metadata and snippets before persistence. The `LLMClient` protocol isolates Ollama and keeps non-LLM fallbacks usable.

```mermaid
flowchart LR
  U[React UI] -->|HTTP| A[FastAPI]
  A --> P[Ingestion pipeline]
  P --> N[NLP stages]
  P --> DB[(PostgreSQL)]
  DB --> K[BM25 / FAISS indexes]
  A --> R[Hybrid retrieval + RAG]
  R --> O[Local Ollama]
  R --> DB
```

```mermaid
flowchart TD
  File --> Parse[Parse transcript]
  Parse --> Utterances[Store utterances]
  Utterances --> Summary[Summary]
  Utterances --> NER[NER and topics]
  Utterances --> Actions[Action extraction]
  Utterances --> Decisions[Decision extraction]
  Utterances --> Chunks[Chunk and index]
```

```mermaid
erDiagram
  MEETING ||--o{ UTTERANCE : has
  MEETING ||--o{ PARTICIPANT : has
  MEETING ||--o{ SUMMARY : has
  MEETING ||--o{ ACTION_ITEM : tracks
  MEETING ||--o{ DECISION : records
  MEETING ||--o{ MEETING_CHUNK : indexes
  CONVERSATION ||--o{ MESSAGE : contains
```

The academic components are separately measurable: `nlp/*` extraction, `knowledge/*` retrieval/indexing, `rag/*` query processing and citation assembly, and `eval/*` metrics/harness.
