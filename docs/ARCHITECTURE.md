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
  MEETING {
    uuid id PK
    string title
    date meeting_date
    string source_filename
    text raw_text
    string status
    text error_message
    float duration_seconds
    json processing_metadata
    datetime created_at
  }
  PARTICIPANT {
    uuid id PK
    uuid meeting_id FK
    string speaker_name
    int utterance_count
    int word_count
  }
  UTTERANCE {
    uuid id PK
    uuid meeting_id FK
    int idx
    string speaker
    text text
    float start_ts
    float end_ts
  }
  SUMMARY {
    uuid id PK
    uuid meeting_id FK
    string method
    text summary_text
    boolean is_primary
    datetime created_at
  }
  TOPIC {
    uuid id PK
    uuid meeting_id FK
    string topic
    float score
  }
  ENTITY {
    uuid id PK
    uuid meeting_id FK
    string text
    string label
    int utterance_idx
  }
  ACTION_ITEM {
    uuid id PK
    uuid meeting_id FK
    text task
    string assignee
    string deadline_text
    date deadline_date
    string status
    boolean assignee_explicit
    boolean deadline_explicit
    float confidence
    int evidence_utterance_idx
    text evidence_quote
    string extraction_method
    datetime created_at
    datetime updated_at
  }
  DECISION {
    uuid id PK
    uuid meeting_id FK
    text decision
    string topic
    int evidence_utterance_idx
    text evidence_quote
    string status
    uuid superseded_by_id FK
    string extraction_method
    datetime created_at
  }
  MEETING_CHUNK {
    uuid id PK
    uuid meeting_id FK
    int chunk_index
    text content
    int utterance_start_idx
    int utterance_end_idx
    int vector_id
  }
  VECTOR_DOC {
    int vector_id PK
    string doc_type
    uuid ref_id
    uuid meeting_id FK
  }
  CONVERSATION {
    uuid id PK
    string title
    json meeting_filter
    datetime created_at
  }
  MESSAGE {
    uuid id PK
    uuid conversation_id FK
    string role
    text content
    json citations
    datetime created_at
  }
  MEETING ||--o{ UTTERANCE : has
  MEETING ||--o{ PARTICIPANT : has
  MEETING ||--o{ SUMMARY : has
  MEETING ||--o{ TOPIC : covers
  MEETING ||--o{ ENTITY : contains
  MEETING ||--o{ ACTION_ITEM : tracks
  MEETING ||--o{ DECISION : records
  DECISION o|--o{ DECISION : supersedes
  MEETING ||--o{ MEETING_CHUNK : indexes
  MEETING ||--o{ VECTOR_DOC : indexes
  CONVERSATION ||--o{ MESSAGE : contains
```

The academic components are separately measurable: `nlp/*` extraction, `knowledge/*` retrieval/indexing, `rag/*` query processing and citation assembly, and `eval/*` metrics/harness.
