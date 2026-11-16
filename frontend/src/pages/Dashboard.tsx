import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  CircleDashed,
  Scale,
  ArrowUpRight,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, type Dashboard as DashboardData } from '../api';
import { Empty, PageHeader, Panel, Skeleton, StatusBadge } from '../components';
import { chartColors, formatDate, formatShortDate, relativeDeadline, deadlineTone, tooltipStyle } from '../format';

const EMPTY_DASHBOARD: DashboardData = {
  totals: {},
  upcoming_deadlines: [],
  recent_meetings: [],
  recent_decisions: [],
  actions_by_assignee: [],
  meetings_per_week: [],
};

const STAT_ACCENTS = {
  brand: 'bg-brand/12 text-brand',
  warn: 'bg-warn/12 text-warn',
  danger: 'bg-danger/12 text-danger',
  info: 'bg-info/12 text-info',
} as const;

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof CalendarDays;
  accent: keyof typeof STAT_ACCENTS;
}) {
  return (
    <div className="card card-pad flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1.5 text-3xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs leading-snug text-muted">{hint}</p>
      </div>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${STAT_ACCENTS[accent]}`}>
        <Icon size={18} />
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  });

  const d = data ?? EMPTY_DASHBOARD;
  const totals = d.totals ?? {};
  const meetings = totals.meetings ?? 0;
  const pending = totals.pending_actions ?? 0;
  const overdue = totals.overdue_actions ?? 0;
  const decisions = totals.active_decisions ?? 0;
  const weeks = d.meetings_per_week ?? [];
  const assignees = d.actions_by_assignee ?? [];
  const deadlines = d.upcoming_deadlines ?? [];
  const recentMeetings = d.recent_meetings ?? [];
  const recentDecisions = d.recent_decisions ?? [];

  return (
    <>
      <PageHeader title="Good to see you" sub="A clear view of what your meetings are moving forward." />

      {isError && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/[0.05] px-4 py-3 text-sm">
          <span className="text-muted">Could not load your dashboard. {(error as Error)?.message}</span>
          <button type="button" className="btn btn-ghost" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card card-pad">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-8 w-16" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Meetings" value={meetings} hint="in your history" icon={CalendarDays} accent="brand" />
            <StatCard label="Pending tasks" value={pending} hint="awaiting progress" icon={CircleDashed} accent="info" />
            <StatCard label="Overdue" value={overdue} hint="past their deadline" icon={AlertTriangle} accent="danger" />
            <StatCard label="Active decisions" value={decisions} hint="still in force" icon={Scale} accent="warn" />
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Meeting activity" className="lg:col-span-2">
          {weeks.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeks} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tickFormatter={(value: string) => formatShortDate(value)}
                    tick={{ fill: chartColors.axis, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: chartColors.axis, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => formatDate(String(value))} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Meetings"
                    stroke={chartColors.brand}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: chartColors.brand, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty text="Your meeting timeline will appear here once you upload a transcript." />
          )}
        </Panel>

        <Panel title="Upcoming deadlines">
          {deadlines.length ? (
            <ul className="-my-2 divide-y divide-line">
              {deadlines.map((item) => {
                const tone = deadlineTone(item.deadline_date);
                const toneClass =
                  tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-muted';
                return (
                  <li key={item.id} className="py-3">
                    <Link to={`/meetings/${item.meeting_id}`} className="group block">
                      <p className="text-sm font-medium leading-snug group-hover:text-brand">{item.task}</p>
                      <p className="mt-1 text-xs text-muted">
                        {item.assignee || 'Unassigned'} ·{' '}
                        <span className={`font-medium ${toneClass}`}>{relativeDeadline(item.deadline_date)}</span>
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty text="No deadlines in the next 14 days." />
          )}
        </Panel>

        <Panel title="Tasks by assignee">
          {assignees.length ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assignees} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="assignee"
                    tick={{ fill: chartColors.axis, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: chartColors.axis, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: chartColors.brandSoft }} />
                  <Bar dataKey="count" name="Tasks" fill={chartColors.brand} radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty text="Tasks will show up here once meetings are processed." />
          )}
        </Panel>

        <Panel title="Recent meetings" className="lg:col-span-2">
          {recentMeetings.length ? (
            <ul className="-my-2 divide-y divide-line">
              {recentMeetings.map((meeting) => (
                <li key={meeting.id}>
                  <Link
                    to={`/meetings/${meeting.id}`}
                    className="group flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-brand">{meeting.title}</p>
                      <p className="text-xs text-muted">{formatDate(meeting.meeting_date)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={meeting.status} />
                      <ArrowUpRight size={15} className="text-muted transition-colors group-hover:text-brand" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="No meetings yet"
              text="Upload your first transcript to start building a searchable meeting history."
              action={
                <Link to="/upload" className="btn">
                  Upload a transcript
                </Link>
              }
            />
          )}
        </Panel>

        <Panel title="Recent decisions">
          {recentDecisions.length ? (
            <ul className="-my-2 divide-y divide-line">
              {recentDecisions.map((decision, index) => (
                <li key={`${decision.meeting_id}-${index}`} className="py-3">
                  <Link to={`/meetings/${decision.meeting_id}`} className="group block text-sm leading-snug">
                    <span className="text-muted">“</span>
                    <span className="group-hover:text-brand">{decision.decision}</span>
                    <span className="text-muted">”</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="Decisions extracted from meetings will appear here." />
          )}
        </Panel>
      </div>
    </>
  );
}
