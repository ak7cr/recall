export function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(iso?: string | null): string {
  const date = parseDate(iso);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(iso?: string | null): string {
  const date = parseDate(iso);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function daysUntil(iso?: string | null): number | null {
  const date = parseDate(iso);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

export function relativeDeadline(iso?: string | null, status?: string): string {
  if (!iso) return 'No deadline';
  if (status === 'done') return formatDate(iso);
  const days = daysUntil(iso);
  if (days === null) return iso;
  if (days < 0) {
    const overdue = Math.abs(days);
    if (overdue > 30) return 'Overdue';
    return `${overdue} day${overdue === 1 ? '' : 's'} overdue`;
  }
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 14) return `Due in ${days} days`;
  return formatDate(iso);
}

export type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info';

export function deadlineTone(iso?: string | null, status?: string): Tone {
  if (status === 'done') return 'ok';
  const days = daysUntil(iso);
  if (days === null) return 'neutral';
  if (days < 0) return 'danger';
  if (days <= 3) return 'warn';
  return 'neutral';
}

export function initials(name?: string | null): string {
  if (!name) return '?';
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || '?'
  );
}

const SPEAKER_TONES: Tone[] = ['brand', 'info', 'ok', 'warn', 'danger'];

export function speakerTone(name: string): Tone {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return SPEAKER_TONES[hash % SPEAKER_TONES.length];
}

export const chartColors = {
  grid: 'rgb(var(--line))',
  axis: 'rgb(var(--muted))',
  brand: 'rgb(var(--brand))',
  brandSoft: 'rgb(var(--brand) / 0.16)',
  ok: 'rgb(var(--ok))',
  info: 'rgb(var(--info))',
  warn: 'rgb(var(--warn))',
  danger: 'rgb(var(--danger))',
  surface: 'rgb(var(--surface))',
  text: 'rgb(var(--ink))',
};

export const tooltipStyle = {
  background: chartColors.surface,
  border: `1px solid ${chartColors.grid}`,
  borderRadius: 12,
  color: chartColors.text,
  fontSize: 12,
  padding: '6px 10px',
  boxShadow: '0 12px 28px -18px rgb(15 23 42 / 0.45)',
};
