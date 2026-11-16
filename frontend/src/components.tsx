import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Inbox,
  Info,
  Loader2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Tone } from './format';

export function PageHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <div className="flex flex-col">
        {(title || action) && (
          <header className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            {title && <h2 className="text-[0.95rem] font-semibold">{title}</h2>}
            {action}
          </header>
        )}
        <div className={`p-5 sm:p-6 ${bodyClassName}`}>{children}</div>
      </div>
    </section>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card card-pad">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-6 w-3/4" />
          <Skeleton className="mt-3 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function Empty({
  icon: Icon = Inbox,
  title,
  text,
  action,
}: {
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-subtle text-muted">
        <Icon size={20} />
      </span>
      {title && <p className="mt-1 text-sm font-semibold">{title}</p>}
      {text && <p className="max-w-sm text-sm leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-subtle text-muted',
  brand: 'bg-brand/12 text-brand',
  ok: 'bg-ok/12 text-ok',
  warn: 'bg-warn/12 text-warn',
  danger: 'bg-danger/12 text-danger',
  info: 'bg-info/12 text-info',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={`badge ${toneClasses[tone]} ${className}`}>{children}</span>;
}

const STATUS_META: Record<string, { tone: Tone; label: string; busy?: boolean }> = {
  ready: { tone: 'ok', label: 'Ready' },
  processing: { tone: 'info', label: 'Processing', busy: true },
  uploaded: { tone: 'warn', label: 'Queued' },
  failed: { tone: 'danger', label: 'Failed' },
  pending: { tone: 'warn', label: 'Pending' },
  in_progress: { tone: 'info', label: 'In progress' },
  done: { tone: 'ok', label: 'Done' },
  active: { tone: 'ok', label: 'Active' },
  superseded: { tone: 'neutral', label: 'Superseded' },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { tone: 'neutral' as Tone, label: status };
  return (
    <Badge tone={meta.tone}>
      {meta.busy ? (
        <Loader2 size={11} className="animate-spin" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {meta.label}
    </Badge>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
  label = 'Sections',
}: {
  tabs: string[];
  value: string;
  onChange: (tab: string) => void;
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="scroll-thin flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const active = tab === value;
        return (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card card-pad flex items-start gap-3 border-danger/30 bg-danger/[0.04]">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
      <div className="flex-1">
        <p className="text-sm font-medium text-ink">Something went wrong</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
      <ArrowLeft size={15} />
      {children}
    </Link>
  );
}

type ToastTone = 'ok' | 'danger' | 'info';
type ToastItem = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

const toastIcon = {
  ok: <CheckCircle2 size={16} className="text-ok" />,
  danger: <AlertTriangle size={16} className="text-danger" />,
  info: <Info size={16} className="text-info" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((message: string, tone: ToastTone = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, tone }]);
    const timer = window.setTimeout(() => dismiss(id), 4000);
    timers.current.push(timer);
  }, [dismiss]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3 text-sm shadow-lift"
          >
            <span className="mt-0.5 shrink-0">{toastIcon[item.tone]}</span>
            <span className="flex-1 leading-snug">{item.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="rounded p-0.5 text-muted transition-colors hover:text-ink"
              onClick={() => dismiss(item.id)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
