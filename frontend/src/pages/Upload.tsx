import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  CircleDashed,
  FileText,
  Loader2,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '../api';
import { PageHeader, useToast } from '../components';

type Phase = 'queued' | 'uploading' | 'processing' | 'ready' | 'failed';

type UploadItem = {
  key: string;
  file: File;
  phase: Phase;
  meetingId?: string;
  error?: string;
};

const ACCEPT = '.txt,.docx,.pdf,.vtt,.srt';
const MAX_BYTES = 10 * 1024 * 1024;

const PHASE_ORDER: Phase[] = ['uploading', 'processing', 'ready'];

function phaseIndex(phase: Phase): number {
  if (phase === 'queued') return -1;
  if (phase === 'failed') return -1;
  return PHASE_ORDER.indexOf(phase);
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'queued':
      return 'Ready to upload';
    case 'uploading':
      return 'Uploading';
    case 'processing':
      return 'Extracting insights';
    case 'ready':
      return 'Processed';
    default:
      return 'Failed';
  }
}

function Stepper({ phase }: { phase: Phase }) {
  if (phase === 'failed') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-danger">
        <XCircle size={14} /> Failed
      </span>
    );
  }
  const current = phaseIndex(phase);
  return (
    <ol className="flex items-center gap-1.5 text-[0.7rem] text-muted">
      {PHASE_ORDER.map((step, index) => {
        const done = current > index || phase === 'ready';
        const active = current === index && phase !== 'ready';
        return (
          <li key={step} className="flex items-center gap-1.5">
            {index > 0 && <span className={`h-px w-4 ${done ? 'bg-ok/60' : 'bg-line'}`} />}
            <span
              className={`flex items-center gap-1 ${done ? 'text-ok' : active ? 'text-brand' : 'text-muted'}`}
            >
              {done ? (
                <CheckCircle2 size={13} />
              ) : active ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CircleDashed size={13} />
              )}
              <span className="capitalize">{phaseLabel(step)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollTimer = useRef<number | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      const accepted: UploadItem[] = [];
      incoming.forEach((file) => {
        if (file.size > MAX_BYTES) {
          toast(`${file.name} is over the 10 MB limit.`, 'danger');
          return;
        }
        accepted.push({
          key: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          phase: 'queued',
        });
      });
      setItems((current) => {
        const keys = new Set(current.map((item) => `${item.file.name}-${item.file.size}`));
        const unique = accepted.filter((item) => !keys.has(`${item.file.name}-${item.file.size}`));
        return [...current, ...unique];
      });
    },
    [toast],
  );

  const poll = useCallback(
    async (ids: string[]) => {
      const results = await Promise.all(
        ids.map((id) =>
          api
            .get(`/meetings/${id}/status`)
            .then((response) => ({ id, ...response.data }))
            .catch(() => ({ id, status: 'processing' as const })),
        ),
      );
      setItems((current) =>
        current.map((item) => {
          const match = results.find((result) => result.id === item.meetingId);
          if (!match) return item;
          if (match.status === 'ready') return { ...item, phase: 'ready' as Phase };
          if (match.status === 'failed')
            return { ...item, phase: 'failed' as Phase, error: match.error_message ?? 'Processing failed' };
          return { ...item, phase: 'processing' as Phase };
        }),
      );
      const allDone = results.every((result) => result.status === 'ready' || result.status === 'failed');
      if (allDone) {
        queryClient.invalidateQueries();
        const failed = results.filter((result) => result.status === 'failed').length;
        toast(
          failed ? `${failed} upload${failed === 1 ? '' : 's'} failed processing.` : 'Meeting processing complete.',
          failed ? 'danger' : 'ok',
        );
      } else {
        pollTimer.current = window.setTimeout(() => poll(ids), 1800);
      }
    },
    [queryClient, toast],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!items.length || busy) return;
    setBusy(true);
    if (pollTimer.current) window.clearTimeout(pollTimer.current);
    const ids: string[] = [];
    for (const item of items) {
      setItems((current) =>
        current.map((row) => (row.key === item.key ? { ...row, phase: 'uploading', error: undefined } : row)),
      );
      const form = new FormData();
      form.append('file', item.file);
      if (title) form.append('title', title);
      if (date) form.append('meeting_date', date);
      try {
        const response = await api.post('/meetings', form);
        const meetingId = response.data.id as string;
        ids.push(meetingId);
        setItems((current) =>
          current.map((row) => (row.key === item.key ? { ...row, meetingId, phase: 'processing' } : row)),
        );
      } catch (error: unknown) {
        const detail =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          'Upload failed. Is the local API running?';
        setItems((current) =>
          current.map((row) => (row.key === item.key ? { ...row, phase: 'failed', error: detail } : row)),
        );
        toast(`${item.file.name}: ${detail}`, 'danger');
      }
    }
    setBusy(false);
    if (ids.length) poll(ids);
  }

  const activeCount = items.filter((item) => ['queued', 'uploading', 'processing'].includes(item.phase)).length;

  return (
    <>
      <PageHeader title="Add meetings" sub="Upload transcripts. Files and processing stay on this machine." />

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="card card-pad">
          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
              dragging ? 'border-brand bg-brand/[0.06]' : 'border-line hover:border-brand/50 hover:bg-brand/[0.03]'
            }`}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand/12 text-brand">
              <UploadCloud size={22} />
            </span>
            <p className="mt-4 font-medium">Drop transcripts here or browse</p>
            <p className="mt-1 text-sm text-muted">TXT, DOCX, PDF, VTT, SRT · up to 10 MB each</p>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              multiple
              accept={ACCEPT}
              onChange={(event) => {
                if (event.target.files?.length) addFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <span className="btn btn-soft mt-5" aria-hidden>
              Choose files
            </span>
          </label>

          {items.length > 0 && (
            <ul className="mt-5 divide-y divide-line">
              {items.map((item) => (
                <li key={item.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <FileText size={17} className="mt-0.5 shrink-0 text-muted" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.file.name}</p>
                      <p className="text-xs text-muted">{(item.file.size / 1024).toFixed(0)} KB</p>
                      {item.error && <p className="mt-1 text-xs text-danger">{item.error}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <Stepper phase={item.phase} />
                    {item.phase === 'ready' && item.meetingId && (
                      <Link to={`/meetings/${item.meetingId}`} className="btn btn-soft px-2.5 py-1.5 text-xs">
                        Open
                      </Link>
                    )}
                    {item.phase !== 'uploading' && item.phase !== 'processing' && (
                      <button
                        type="button"
                        aria-label={`Remove ${item.file.name}`}
                        className="rounded p-1 text-muted transition-colors hover:text-danger"
                        onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card card-pad h-fit">
          <h2 className="font-semibold">Meeting details</h2>
          <p className="mt-1 text-sm text-muted">Optional. Applies to every file in this batch.</p>
          <label className="mt-5 block text-sm">
            <span className="mb-1.5 block font-medium">Title</span>
            <input
              className="input"
              placeholder="e.g. Architecture review"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="mt-4 block text-sm">
            <span className="mb-1.5 block font-medium">Meeting date</span>
            <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>

          <button type="submit" className="btn mt-5 w-full" disabled={!items.length || busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {busy ? 'Uploading…' : 'Upload and process'}
          </button>

          {activeCount > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
              <Loader2 size={12} className="animate-spin" />
              {activeCount} file{activeCount === 1 ? '' : 's'} in progress
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Processing extracts a summary, topics, entities, decisions, and action items. A meeting stays available
            while it processes.
          </p>
        </div>
      </form>
    </>
  );
}
