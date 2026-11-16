import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronDown, Loader2, Quote, UserRound } from 'lucide-react';
import { api, type Action } from './api';
import { Badge, useToast } from './components';
import { deadlineTone, relativeDeadline, type Tone } from './format';

const DEADLINE_TEXT: Record<Tone, string> = {
  neutral: 'text-muted',
  brand: 'text-brand',
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  info: 'text-info',
};

export function ActionCard({ action, draggable = false }: { action: Action; draggable?: boolean }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function save(patch: Partial<Action>, message: string) {
    setSaving(true);
    try {
      await api.patch(`/actions/${action.id}`, patch);
      await queryClient.invalidateQueries();
      toast(message, 'ok');
    } catch {
      toast('Could not update that action item.', 'danger');
    } finally {
      setSaving(false);
    }
  }

  const tone = deadlineTone(action.deadline_date, action.status);

  return (
    <article
      draggable={draggable}
      onDragStart={
        draggable
          ? (event) => {
              event.dataTransfer.setData('text/action', action.id);
              event.dataTransfer.effectAllowed = 'move';
            }
          : undefined
      }
      className={`card p-4 transition hover:shadow-soft ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{action.task}</p>
        {saving && <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin text-muted" />}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone={tone}>{relativeDeadline(action.deadline_date, action.status)}</Badge>
        {!action.assignee_explicit && <Badge tone="neutral">Inferred assignee</Badge>}
        {!action.deadline_explicit && action.deadline_date && <Badge tone="neutral">Inferred deadline</Badge>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-[0.7rem] font-medium uppercase tracking-wide text-muted">
          Assignee
          <input
            aria-label={`Assignee for ${action.task}`}
            className="input mt-1 text-sm font-normal normal-case tracking-normal"
            defaultValue={action.assignee ?? ''}
            placeholder="Unassigned"
            onBlur={(event) => {
              const next = event.target.value.trim();
              if (next !== (action.assignee ?? '')) save({ assignee: next || null }, 'Assignee updated');
            }}
          />
        </label>
        <label className="text-[0.7rem] font-medium uppercase tracking-wide text-muted">
          Status
          <select
            aria-label={`Status for ${action.task}`}
            className="input mt-1 text-sm font-normal normal-case tracking-normal"
            value={action.status}
            onChange={(event) => save({ status: event.target.value }, 'Status updated')}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </label>
      </div>

      <label className="mt-2 block text-[0.7rem] font-medium uppercase tracking-wide text-muted">
        Deadline
        <input
          aria-label={`Deadline for ${action.task}`}
          type="date"
          className="input mt-1 text-sm font-normal normal-case tracking-normal"
          defaultValue={action.deadline_date ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            if (value !== (action.deadline_date ?? '')) save({ deadline_date: value || null }, 'Deadline updated');
          }}
        />
      </label>
      {action.deadline_text && action.deadline_text !== action.deadline_date && (
        <p className="mt-1.5 text-xs text-muted">
          <span className={DEADLINE_TEXT[tone]}>“{action.deadline_text}”</span> as spoken
        </p>
      )}

      <details className="group mt-3 border-t border-line pt-2.5">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink">
          <Quote size={12} />
          Evidence · line {action.evidence_utterance_idx}
          <ChevronDown size={13} className="ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <blockquote className="mt-2 rounded-lg bg-subtle px-3 py-2 text-xs leading-relaxed text-muted">
          “{action.evidence_quote}”
        </blockquote>
        <Link
          to={`/meetings/${action.meeting_id}?line=${action.evidence_utterance_idx}`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          <UserRound size={12} />
          Open in transcript
        </Link>
      </details>
    </article>
  );
}
