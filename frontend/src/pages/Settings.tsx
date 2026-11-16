import { useQuery } from '@tanstack/react-query';
import { CircleCheck, CircleX, Database, Moon, Sun } from 'lucide-react';
import { api } from '../api';
import { Badge, ErrorState, PageHeader, Panel, Skeleton } from '../components';
import { useTheme } from '../theme';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`badge ${ok ? 'bg-ok/12 text-ok' : 'bg-danger/12 text-danger'}`}>
      {ok ? <CircleCheck size={12} /> : <CircleX size={12} />}
      {label}
    </span>
  );
}

export default function SettingsPage() {
  const { mode, setMode } = useTheme();
  const { data, isLoading, isError, refetch } = useQuery<Record<string, unknown>>({
    queryKey: ['health'],
    queryFn: () => api.get('/health').then((r) => r.data),
    refetchInterval: 15_000,
  });

  const ollama = asRecord(data?.ollama);
  const spacy = asRecord(data?.spacy_en_core_web_lg);
  const minilm = asRecord(data?.minilm);
  const bart = asRecord(data?.bart);
  const t5 = asRecord(data?.t5);
  const databaseOk = data?.database === 'ok';

  const models = [
    {
      name: 'spaCy · en_core_web_lg',
      description: 'Named-entity recognition and sentence segmentation',
      ok: Boolean(spacy.installed),
      detail: spacy.loaded ? 'Loaded in memory' : spacy.installed ? 'Installed, not loaded yet' : 'Not installed',
    },
    {
      name: `MiniLM · ${String(minilm.model ?? 'all-MiniLM-L6-v2')}`,
      description: 'Embeddings for topics, deduplication, and dense retrieval',
      ok: Boolean(minilm.loaded) || Boolean(minilm.model),
      detail: minilm.loaded ? 'Loaded in memory' : 'Downloads on first use',
    },
    {
      name: `BART · ${String(bart.model ?? 'facebook/bart-large-cnn')}`,
      description: 'Extractive-abstractive summarization baseline',
      ok: Boolean(bart.loaded),
      detail: bart.loaded ? 'Loaded in memory' : 'Not loaded',
    },
    {
      name: `T5 · ${String(t5.model ?? 'google/flan-t5-base')}`,
      description: 'Summarization baseline',
      ok: Boolean(t5.loaded),
      detail: t5.loaded ? 'Loaded in memory' : 'Not loaded',
    },
  ];

  return (
    <>
      <PageHeader title="Settings & health" sub="Local services and models used by Recall. Nothing leaves this machine.">
        <button type="button" className="btn btn-ghost" onClick={() => refetch()}>
          Refresh
        </button>
      </PageHeader>

      {isError ? (
        <ErrorState message="Could not reach the local API. Is the backend running on port 8000?" onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Services">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                <li className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-info/12 text-info">
                      <Database size={15} />
                    </span>
                    <div>
                      <p className="text-sm font-medium">PostgreSQL</p>
                      <p className="text-xs text-muted">Meeting records and evidence</p>
                    </div>
                  </div>
                  <StatusPill ok={databaseOk} label={databaseOk ? 'Connected' : String(data?.database ?? 'Unknown')} />
                </li>
                <li className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/12 text-brand">
                      <span className="text-xs font-bold">AI</span>
                    </span>
                    <div>
                      <p className="text-sm font-medium">Ollama</p>
                      <p className="text-xs text-muted">{String(ollama.model ?? 'No model configured')}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusPill ok={Boolean(ollama.reachable)} label={ollama.reachable ? 'Reachable' : 'Unreachable'} />
                    <span className="text-[0.7rem] text-muted">
                      {ollama.model_present ? 'Model present' : 'Model not pulled'}
                    </span>
                  </div>
                </li>
              </ul>
            )}
            {!isLoading && Boolean(data?.status) && (
              <p className="mt-3 text-xs text-muted">
                Overall status: <span className="font-medium text-ink">{String(data?.status)}</span>
              </p>
            )}
          </Panel>

          <Panel title="Models">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {models.map((model) => (
                  <li key={model.name} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{model.name}</p>
                      <p className="text-xs text-muted">{model.description}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={model.ok ? 'ok' : 'neutral'}>{model.ok ? 'Available' : 'Optional'}</Badge>
                      <span className="text-[0.7rem] text-muted">{model.detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Appearance">
            <p className="text-sm text-muted">Choose how Recall looks. Your choice is remembered on this device.</p>
            <div className="mt-4 inline-flex rounded-xl border border-line bg-surface p-0.5">
              {(
                [
                  ['light', 'Light', Sun],
                  ['dark', 'Dark', Moon],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                  className={`inline-flex items-center gap-1.5 rounded-[0.6rem] px-4 py-2 text-sm font-medium transition ${
                    mode === value ? 'bg-brand/12 text-brand' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="About">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">App</dt>
              <dd className="font-medium">Recall</dd>
              <dt className="text-muted">Mode</dt>
              <dd className="font-medium">Local-first, single user</dd>
              <dt className="text-muted">API</dt>
              <dd className="font-medium">http://localhost:8000</dd>
              <dt className="text-muted">Privacy</dt>
              <dd className="font-medium">Transcripts never leave this machine</dd>
            </dl>
          </Panel>
        </div>
      )}
    </>
  );
}
