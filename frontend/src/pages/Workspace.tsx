import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Gavel,
  ListChecks,
  Loader2,
  MessagesSquare,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, type Meeting, type Utterance } from '../api';
import {
  BackLink,
  Badge,
  Empty,
  Panel,
  Skeleton,
  StatusBadge,
  Tabs,
  useToast,
} from '../components';
import { ActionCard } from '../action-card';
import {
  chartColors,
  formatDate,
  speakerTone,
  tooltipStyle,
} from '../format';

const TABS = ['Summary', 'Transcript', 'Topics & entities', 'Decisions', 'Action items', 'Participants'];

export default function Workspace() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('Summary');
  const [lineQuery, setLineQuery] = useState('');
  const [method, setMethod] = useState<string | null>(null);
  const [busy, setBusy] = useState<'reprocess' | 'delete' | null>(null);

  const targetLine = params.get('line');

  const meetingQuery = useQuery<Meeting>({
    queryKey: ['meeting', id],
    queryFn: () => api.get(`/meetings/${id}`).then((r) => r.data),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'processing' || status === 'uploaded' ? 2000 : false;
    },
  });

  const transcriptQuery = useQuery<Utterance[]>({
    queryKey: ['transcript', id],
    queryFn: () => api.get(`/meetings/${id}/transcript`).then((r) => r.data),
  });

  const meeting = meetingQuery.data;
  const lines = transcriptQuery.data ?? [];

  useEffect(() => {
    if (!targetLine) return;
    setTab('Transcript');
  }, [targetLine]);

  useEffect(() => {
    if (tab !== 'Transcript' || !targetLine) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`line-${targetLine}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [tab, targetLine, lines.length]);

  const summaries = meeting?.summaries ?? [];
  const activeMethod = useMemo(() => {
    if (method && summaries.some((summary) => summary.method === method)) return method;
    return summaries.find((summary) => summary.is_primary)?.method ?? summaries[0]?.method ?? '';
  }, [method, summaries]);
  const activeSummary = summaries.find((summary) => summary.method === activeMethod);

  const filteredLines = useMemo(() => {
    const needle = lineQuery.trim().toLowerCase();
    if (!needle) return lines;
    return lines.filter(
      (line) => line.text.toLowerCase().includes(needle) || line.speaker.toLowerCase().includes(needle),
    );
  }, [lines, lineQuery]);

  const entitiesByLabel = useMemo(() => {
    const groups = new Map<string, { text: string; utterance_idx: number }[]>();
    (meeting?.entities ?? []).forEach((entity) => {
      const list = groups.get(entity.label) ?? [];
      list.push({ text: entity.text, utterance_idx: entity.utterance_idx });
      groups.set(entity.label, list);
    });
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [meeting?.entities]);

  async function reprocess() {
    setBusy('reprocess');
    try {
      await api.post(`/meetings/${id}/reprocess`);
      await queryClient.invalidateQueries({ queryKey: ['meeting', id] });
      toast('Reprocessing started.', 'info');
    } catch {
      toast('Could not start reprocessing.', 'danger');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${meeting?.title ?? 'this meeting'}”? This cannot be undone.`)) return;
    setBusy('delete');
    try {
      await api.delete(`/meetings/${id}`);
      await queryClient.invalidateQueries();
      toast('Meeting deleted.', 'ok');
      navigate('/meetings');
    } catch {
      toast('Could not delete the meeting.', 'danger');
      setBusy(null);
    }
  }

  if (meetingQuery.isError) {
    return (
      <div className="card card-pad">
        <Empty
          title="Meeting not found"
          text="It may have been deleted, or the local API may be unavailable."
          action={
            <Link to="/meetings" className="btn">
              Back to meetings
            </Link>
          }
        />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <BackLink to="/meetings">All meetings</BackLink>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{meeting.title}</h1>
            <StatusBadge status={meeting.status} />
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} />
              {formatDate(meeting.meeting_date)}
            </span>
            {meeting.source_filename && (
              <span className="inline-flex items-center gap-1.5">
                <FileText size={14} />
                {meeting.source_filename}
              </span>
            )}
          </p>
          {meeting.status === 'failed' && meeting.error_message && (
            <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{meeting.error_message}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/chat?meeting=${id}`} className="btn">
            <MessagesSquare size={16} />
            Chat with meeting
          </Link>
          <button type="button" className="btn btn-ghost" onClick={reprocess} disabled={busy !== null}>
            {busy === 'reprocess' ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Reprocess
          </button>
          <button type="button" className="btn btn-danger" onClick={remove} disabled={busy !== null}>
            {busy === 'delete' ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete
          </button>
        </div>
      </div>

      {meeting.processing_metadata && (
        <details className="card mb-5 px-5 py-4">
          <summary className="cursor-pointer text-sm font-medium text-muted">Processing methods and stage status</summary>
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-subtle p-3 text-xs">
            {JSON.stringify(meeting.processing_metadata, null, 2)}
          </pre>
        </details>
      )}

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      <div className="mt-5">
        {tab === 'Summary' && (
          <Panel
            title="Meeting summary"
            action={
              summaries.length > 1 ? (
                <div className="flex flex-wrap gap-1">
                  {summaries.map((summary) => (
                    <button
                      key={summary.method}
                      type="button"
                      onClick={() => setMethod(summary.method)}
                      className={`badge uppercase ${
                        summary.method === activeMethod ? 'bg-brand/15 text-brand' : 'bg-subtle text-muted'
                      }`}
                    >
                      {summary.method}
                      {summary.is_primary ? ' · primary' : ''}
                    </button>
                  ))}
                </div>
              ) : undefined
            }
          >
            {activeSummary ? (
              <div className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">{activeSummary.summary_text}</div>
            ) : (
              <Empty
                icon={FileText}
                title={meeting.status === 'ready' ? 'No summary available' : 'Summary is being generated'}
                text={
                  meeting.status === 'ready'
                    ? 'This meeting was processed without a summarization model. Try reprocessing once Ollama is running.'
                    : 'This usually takes under a minute.'
                }
              />
            )}
          </Panel>
        )}

        {tab === 'Transcript' && (
          <Panel
            title={`Transcript · ${lines.length} lines`}
            action={
              <div className="relative w-full sm:w-64">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  aria-label="Search transcript"
                  className="input pl-8"
                  placeholder="Search this transcript"
                  value={lineQuery}
                  onChange={(event) => setLineQuery(event.target.value)}
                />
              </div>
            }
          >
            {filteredLines.length ? (
              <div className="scroll-thin -mx-1 max-h-[38rem] space-y-1 overflow-y-auto pr-1">
                {filteredLines.map((line) => {
                  const active = targetLine === String(line.idx);
                  return (
                    <div
                      id={`line-${line.idx}`}
                      key={line.idx}
                      className={`flex gap-3 rounded-lg px-3 py-2.5 scroll-mt-24 transition-colors ${
                        active ? 'bg-warn/15 ring-1 ring-warn/40' : 'hover:bg-subtle'
                      }`}
                    >
                      <a
                        href={`#line-${line.idx}`}
                        className="mt-0.5 w-9 shrink-0 text-right text-xs tabular-nums text-muted hover:text-brand"
                        aria-label={`Link to line ${line.idx}`}
                      >
                        #{line.idx}
                      </a>
                      <div className="min-w-0">
                        <Badge tone={speakerTone(line.speaker)} className="mb-1">
                          {line.speaker}
                        </Badge>
                        <p className="text-sm leading-relaxed">{line.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty
                icon={Search}
                text={lineQuery ? `No lines match “${lineQuery}”.` : 'No transcript lines were extracted.'}
              />
            )}
          </Panel>
        )}

        {tab === 'Topics & entities' && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Topics">
              {meeting.topics?.length ? (
                <div className="flex flex-wrap gap-2">
                  {meeting.topics.map((topic) => (
                    <span
                      key={topic.topic}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-sm text-brand"
                    >
                      <Tag size={13} />
                      {topic.topic}
                    </span>
                  ))}
                </div>
              ) : (
                <Empty icon={Tag} text="No topics were extracted for this meeting." />
              )}
            </Panel>

            <Panel title="Entities">
              {entitiesByLabel.length ? (
                <div className="space-y-4">
                  {entitiesByLabel.map(([label, items]) => (
                    <div key={label}>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">{label}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {items.map((entity, index) => (
                          <Link
                            key={`${entity.text}-${index}`}
                            to={`?line=${entity.utterance_idx}`}
                            className="rounded-full border border-line bg-subtle px-2.5 py-1 text-xs transition-colors hover:border-brand/40 hover:text-brand"
                          >
                            {entity.text}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty icon={Users} text="No named entities were extracted." />
              )}
            </Panel>
          </div>
        )}

        {tab === 'Decisions' && (
          <div className="space-y-3">
            {meeting.decisions?.length ? (
              meeting.decisions.map((decision) => (
                <article key={decision.id} className="card card-pad">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="flex items-start gap-2 font-medium leading-snug">
                      <Gavel size={17} className="mt-0.5 shrink-0 text-brand" />
                      {decision.decision}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {decision.topic && <Badge tone="info">{decision.topic}</Badge>}
                      <StatusBadge status={decision.status} />
                    </div>
                  </div>
                  <blockquote className="mt-3 border-l-2 border-line pl-3 text-sm leading-relaxed text-muted">
                    “{decision.evidence_quote}”
                  </blockquote>
                  <Link
                    to={`?line=${decision.evidence_utterance_idx}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    View transcript line {decision.evidence_utterance_idx}
                    <ArrowRight size={14} />
                  </Link>
                </article>
              ))
            ) : (
              <Panel>
                <Empty icon={Gavel} text="No decisions were detected in this meeting." />
              </Panel>
            )}
          </div>
        )}

        {tab === 'Action items' && (
          <div>
            {meeting.action_items?.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {meeting.action_items.map((action) => (
                  <ActionCard key={action.id} action={action} />
                ))}
              </div>
            ) : (
              <Panel>
                <Empty icon={ListChecks} text="No action items were detected in this meeting." />
              </Panel>
            )}
          </div>
        )}

        {tab === 'Participants' && (
          <Panel title="Who spoke, and how much" bodyClassName="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            {meeting.participants?.length ? (
              <>
                <ul className="divide-y divide-line">
                  {meeting.participants.map((participant) => (
                    <li key={participant.speaker_name} className="flex items-center justify-between py-2.5">
                      <Badge tone={speakerTone(participant.speaker_name)}>{participant.speaker_name}</Badge>
                      <span className="text-sm text-muted">
                        {participant.utterance_count} utterances · {participant.word_count} words
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={meeting.participants} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="speaker_name"
                        tick={{ fill: chartColors.axis, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: chartColors.axis, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: chartColors.brandSoft }} />
                      <Bar dataKey="word_count" name="Words" fill={chartColors.brand} radius={[6, 6, 0, 0]} maxBarSize={44} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="lg:col-span-2">
                <Empty icon={Users} text="No speaker labels were found in this transcript." />
              </div>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}
