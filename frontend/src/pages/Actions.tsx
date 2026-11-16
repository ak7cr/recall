import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarClock, Filter, LayoutGrid, ListChecks, Table2 } from 'lucide-react';
import { api, type Action, type MeetingListItem } from '../api';
import { Badge, Empty, PageHeader, Skeleton, useToast } from '../components';
import { ActionCard } from '../action-card';
import { deadlineTone, formatDate, relativeDeadline } from '../format';

const COLUMNS = [
  { key: 'pending', label: 'Pending', dot: 'bg-warn' },
  { key: 'in_progress', label: 'In progress', dot: 'bg-info' },
  { key: 'done', label: 'Done', dot: 'bg-ok' },
] as const;

export default function Actions() {
  const [status, setStatus] = useState('');
  const [assignee, setAssignee] = useState('');
  const [meeting, setMeeting] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const queryClient = useQueryClient();
  const toast = useToast();

  const meetingsQuery = useQuery<MeetingListItem[]>({
    queryKey: ['meetings'],
    queryFn: () => api.get('/meetings').then((r) => r.data),
  });
  const actionsQuery = useQuery<Action[]>({
    queryKey: ['actions', status, assignee, meeting, overdue],
    queryFn: () =>
      api
        .get('/actions', {
          params: {
            status: status || undefined,
            assignee: assignee || undefined,
            meeting_id: meeting || undefined,
            overdue: overdue || undefined,
          },
        })
        .then((r) => r.data),
  });

  const meetings = meetingsQuery.data ?? [];
  const actions = actionsQuery.data ?? [];
  const meetingTitles = useMemo(
    () => new Map(meetings.map((item) => [item.id, item.title])),
    [meetings],
  );
  const hasFilters = Boolean(status || assignee || meeting || overdue);

  async function moveTo(actionId: string, nextStatus: string) {
    try {
      await api.patch(`/actions/${actionId}`, { status: nextStatus });
      await queryClient.invalidateQueries();
      toast(`Moved to ${nextStatus.replace('_', ' ')}.`, 'ok');
    } catch {
      toast('Could not move that action item.', 'danger');
    }
  }

  return (
    <>
      <PageHeader title="Action tracker" sub="Keep ownership and deadlines moving across every meeting.">
        <div className="inline-flex rounded-xl border border-line bg-surface p-0.5">
          {(
            [
              ['kanban', 'Board', LayoutGrid],
              ['table', 'Table', Table2],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`inline-flex items-center gap-1.5 rounded-[0.6rem] px-3 py-1.5 text-sm font-medium transition ${
                view === key ? 'bg-brand/12 text-brand' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <span className="flex items-center gap-1.5 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <Filter size={13} />
          Filters
        </span>
        <label className="text-xs font-medium text-muted">
          Status
          <select
            aria-label="Filter status"
            className="input mt-1 block sm:w-40"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Assignee
          <input
            aria-label="Filter assignee"
            className="input mt-1 block sm:w-40"
            placeholder="Any assignee"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Meeting
          <select
            aria-label="Filter meeting"
            className="input mt-1 block sm:w-48"
            value={meeting}
            onChange={(event) => setMeeting(event.target.value)}
          >
            <option value="">All meetings</option>
            {meetings.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-muted">
          <input
            type="checkbox"
            className="accent-[rgb(var(--brand))]"
            checked={overdue}
            onChange={(event) => setOverdue(event.target.checked)}
          />
          Overdue only
        </label>
        {hasFilters && (
          <button
            type="button"
            className="btn btn-ghost ml-auto"
            onClick={() => {
              setStatus('');
              setAssignee('');
              setMeeting('');
              setOverdue(false);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {actionsQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => (
            <div key={column.key} className="card p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-24 w-full" />
              <Skeleton className="mt-3 h-24 w-full" />
            </div>
          ))}
        </div>
      ) : actions.length === 0 ? (
        <div className="card">
          <Empty
            icon={ListChecks}
            title={hasFilters ? 'No matching action items' : 'Nothing tracked yet'}
            text={
              hasFilters
                ? 'Adjust the filters to see more tasks.'
                : 'Action items extracted from your meetings will be collected here.'
            }
          />
        </div>
      ) : view === 'kanban' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnActions = actions.filter((action) => action.status === column.key);
            return (
              <div
                key={column.key}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData('text/action');
                  if (id) moveTo(id, column.key);
                }}
                className="rounded-2xl border border-line bg-subtle/50 p-3"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <span className={`h-2 w-2 rounded-full ${column.dot}`} />
                    {column.label}
                  </h2>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-muted">
                    {columnActions.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {columnActions.length ? (
                    columnActions.map((action) => <ActionCard key={action.id} action={action} draggable />)
                  ) : (
                    <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
                      Drop tasks here
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-subtle text-[0.7rem] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Task</th>
                  <th className="px-4 py-3 font-semibold">Assignee</th>
                  <th className="px-4 py-3 font-semibold">Meeting</th>
                  <th className="px-4 py-3 font-semibold">Deadline</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {actions.map((action) => {
                  const tone = deadlineTone(action.deadline_date, action.status);
                  return (
                    <tr key={action.id} className="hover:bg-subtle/60">
                      <td className="max-w-xs px-4 py-3">
                        <p className="font-medium leading-snug">{action.task}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{action.assignee || 'Unassigned'}</td>
                      <td className="max-w-[12rem] truncate px-4 py-3">
                        <Link
                          to={`/meetings/${action.meeting_id}`}
                          className="text-muted transition-colors hover:text-brand"
                        >
                          {meetingTitles.get(action.meeting_id) ?? 'Meeting'}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge tone={tone}>
                          <CalendarClock size={11} />
                          {relativeDeadline(action.deadline_date, action.status)}
                        </Badge>
                        {action.deadline_date && (
                          <p className="mt-1 text-xs text-muted">{formatDate(action.deadline_date)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Status for ${action.task}`}
                          className="input w-36 py-1.5 text-xs"
                          value={action.status}
                          onChange={(event) => moveTo(action.id, event.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/meetings/${action.meeting_id}?line=${action.evidence_utterance_idx}`}
                          className="text-xs font-medium text-brand hover:underline"
                        >
                          Line {action.evidence_utterance_idx}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
