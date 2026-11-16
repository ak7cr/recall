import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GitCompare, Loader2, Sparkles } from 'lucide-react';
import { api, type CompareResult, type MeetingListItem } from '../api';
import { Badge, Empty, ErrorState, PageHeader, Panel, Skeleton, StatusBadge } from '../components';
import { formatDate } from '../format';

const MAX_SELECTION = 3;

export default function Compare() {
  const [ids, setIds] = useState<string[]>([]);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const meetingsQuery = useQuery<MeetingListItem[]>({
    queryKey: ['meetings'],
    queryFn: () => api.get('/meetings').then((r) => r.data),
  });
  const meetings = meetingsQuery.data ?? [];

  const ordered = useMemo(
    () =>
      [...meetings]
        .filter((meeting) => ids.includes(meeting.id))
        .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date)),
    [meetings, ids],
  );

  function toggle(id: string) {
    setResult(null);
    setIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_SELECTION) return current;
      return [...current, id];
    });
  }

  async function run() {
    setBusy(true);
    setError('');
    try {
      const response = await api.post('/meetings/compare', { meeting_ids: ordered.map((meeting) => meeting.id) });
      setResult(response.data);
    } catch (requestError: unknown) {
      const detail = (requestError as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? 'Could not compare these meetings. Check that the local API is running.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Compare meetings" sub="See what was decided, changed, or dropped between meetings." />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Choose 2–3 meetings">
          {meetingsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-2/3" />
            </div>
          ) : meetings.length ? (
            <div className="scroll-thin max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {meetings.map((meeting) => {
                const checked = ids.includes(meeting.id);
                const disabled = !checked && ids.length >= MAX_SELECTION;
                return (
                  <label
                    key={meeting.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                      checked ? 'border-brand/40 bg-brand/[0.06]' : 'border-line hover:bg-subtle'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <input
                        type="checkbox"
                        className="accent-[rgb(var(--brand))]"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(meeting.id)}
                      />
                      <span className="truncate">{meeting.title}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{formatDate(meeting.meeting_date)}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <Empty text="Upload at least two meetings to compare them." />
          )}
        </Panel>

        <Panel title="Selection">
          {ordered.length ? (
            <ol className="space-y-2">
              {ordered.map((meeting, index) => (
                <li key={meeting.id} className="flex items-center gap-2 text-sm">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/12 text-xs font-semibold text-brand">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{meeting.title}</span>
                  <StatusBadge status={meeting.status} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Select at least two meetings to generate a comparison.</p>
          )}
          <button
            type="button"
            className="btn mt-5 w-full"
            disabled={ids.length < 2 || busy}
            onClick={run}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <GitCompare size={16} />}
            {busy ? 'Comparing…' : 'Compare selected'}
          </button>
          <p className="mt-2 text-xs text-muted">
            Comparisons use each meeting’s summaries, decisions, and action items. The narrative is written by your
            local Ollama model.
          </p>
        </Panel>
      </div>

      {error && (
        <div className="mt-5">
          <ErrorState message={error} />
        </div>
      )}

      {busy && !result && (
        <div className="mt-5 space-y-3">
          <Skeleton className="h-28 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-5">
          <Panel
            title="What changed"
            action={
              <Badge tone="brand">
                <Sparkles size={12} />
                Local model
              </Badge>
            }
          >
            <p className="prose-answer text-[0.95rem] leading-relaxed">{result.comparison}</p>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(result.meetings ?? []).map((meeting) => (
              <Panel key={meeting.id} title={meeting.title}>
                <p className="mb-4 text-xs text-muted">{formatDate(meeting.meeting_date)}</p>

                <h3 className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">Decisions</h3>
                {meeting.decisions?.length ? (
                  <ul className="mt-2 space-y-2">
                    {meeting.decisions.map((decision) => (
                      <li key={decision.id} className="text-sm leading-snug">
                        {decision.decision}{' '}
                        <span className="text-xs text-muted">({decision.status})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">No decisions recorded.</p>
                )}

                <h3 className="mt-5 text-[0.7rem] font-semibold uppercase tracking-wide text-muted">Action items</h3>
                {meeting.action_items?.length ? (
                  <ul className="mt-2 space-y-2">
                    {meeting.action_items.map((action) => (
                      <li key={action.id} className="text-sm leading-snug">
                        {action.task} <span className="text-xs text-muted">· {action.assignee || 'Unassigned'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">No action items recorded.</p>
                )}

                <Link to={`/meetings/${meeting.id}`} className="btn btn-ghost mt-5 w-full">
                  Open meeting
                </Link>
              </Panel>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
