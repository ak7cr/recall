import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, FolderOpen, Search, Upload } from 'lucide-react';
import { api, type MeetingListItem } from '../api';
import { Empty, PageHeader, SkeletonCards, StatusBadge } from '../components';
import { formatDate } from '../format';

type SortKey = 'newest' | 'oldest' | 'title' | 'actions';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'actions', label: 'Most action items' },
];

function sortMeetings(rows: MeetingListItem[], key: SortKey): MeetingListItem[] {
  const copy = [...rows];
  switch (key) {
    case 'oldest':
      return copy.sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case 'actions':
      return copy.sort((a, b) => (b.actions ?? 0) - (a.actions ?? 0));
    default:
      return copy.sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));
  }
}

export default function Meetings() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const { data, isLoading } = useQuery<MeetingListItem[]>({
    queryKey: ['meetings', query, status],
    queryFn: () =>
      api
        .get('/meetings', { params: { q: query || undefined, status: status || undefined } })
        .then((r) => r.data),
  });

  const rows = useMemo(() => sortMeetings(data ?? [], sort), [data, sort]);

  return (
    <>
      <PageHeader title="Meetings" sub="Your searchable meeting history, with evidence-linked records.">
        <Link to="/upload" className="btn">
          <Upload size={16} />
          Upload
        </Link>
      </PageHeader>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            aria-label="Search meetings"
            className="input pl-9"
            placeholder="Search meetings by title"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          aria-label="Filter by status"
          className="input sm:w-44"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="ready">Ready</option>
          <option value="processing">Processing</option>
          <option value="uploaded">Queued</option>
          <option value="failed">Failed</option>
        </select>
        <select
          aria-label="Sort meetings"
          className="input sm:w-48"
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <SkeletonCards count={6} />
      ) : rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((meeting) => (
            <Link
              key={meeting.id}
              to={`/meetings/${meeting.id}`}
              className="card card-pad group flex flex-col transition hover:border-brand/40 hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold leading-snug group-hover:text-brand">{meeting.title}</h2>
                <ArrowUpRight
                  size={17}
                  className="mt-0.5 shrink-0 text-muted transition-colors group-hover:text-brand"
                />
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                <CalendarDays size={13} />
                {formatDate(meeting.meeting_date)}
              </p>
              <div className="mt-3">
                <StatusBadge status={meeting.status} />
              </div>
              <dl className="mt-auto grid grid-cols-3 gap-2 pt-5 text-center">
                {[
                  ['Participants', meeting.participants],
                  ['Actions', meeting.actions],
                  ['Decisions', meeting.decisions],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-subtle py-2">
                    <dt className="text-[0.68rem] uppercase tracking-wide text-muted">{label}</dt>
                    <dd className="text-sm font-semibold tabular-nums">{value ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card">
          <Empty
            icon={query || status ? FolderOpen : CalendarDays}
            title={query || status ? 'No matching meetings' : 'No meetings yet'}
            text={
              query || status
                ? 'Try a different search term or clear the filters.'
                : 'Upload a transcript to extract summaries, decisions, and action items.'
            }
            action={
              query || status ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setQuery('');
                    setStatus('');
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <Link to="/upload" className="btn">
                  Upload a transcript
                </Link>
              )
            }
          />
        </div>
      )}
    </>
  );
}
