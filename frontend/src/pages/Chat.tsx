import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  Loader2,
  MessageSquarePlus,
  MessagesSquare,
  SearchX,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { api, type ChatMessage, type Citation, type Conversation, type MeetingListItem } from '../api';
import { Badge, Empty, PageHeader, useToast } from '../components';
import { formatDate } from '../format';

const STARTERS = [
  'What did we decide about the backend architecture?',
  'Who owns the open action items?',
  'What changed between the first and latest meeting?',
  'What happened with our database migration?',
];

const NO_EVIDENCE = /couldn.t find|not found in your meetings|no evidence/i;

function AnswerBody({ content }: { content: string }) {
  const parts = useMemo(() => content.split(/(\[S\d+\])/g), [content]);
  return (
    <p className="prose-answer text-[0.95rem]">
      {parts.map((part, index) =>
        /^\[S\d+\]$/.test(part) ? (
          <span
            key={index}
            className="mx-0.5 inline-flex translate-y-[-1px] items-center rounded-md bg-brand/12 px-1.5 py-0.5 text-[0.7rem] font-semibold text-brand"
            title="Cited source"
          >
            {part.slice(1, -1)}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

function SourceLink({ citation }: { citation: Citation }) {
  const range =
    citation.utterance_end_idx !== citation.utterance_start_idx
      ? `lines ${citation.utterance_start_idx}–${citation.utterance_end_idx}`
      : `lines ${citation.utterance_start_idx}`;
  return (
    <li className="rounded-lg border border-line bg-subtle/60 px-3 py-2">
      <Link
        to={`/meetings/${citation.meeting_id}?line=${citation.utterance_start_idx}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
      >
        {citation.meeting_title} · {range}
        <ExternalLink size={11} />
      </Link>
      {citation.snippet && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">“{citation.snippet}”</p>
      )}
      <p className="mt-1 text-[0.7rem] text-muted">{formatDate(citation.meeting_date)}</p>
    </li>
  );
}

export default function Chat() {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const meetingsQuery = useQuery<MeetingListItem[]>({
    queryKey: ['meetings'],
    queryFn: () => api.get('/meetings').then((r) => r.data),
  });
  const conversationsQuery = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations').then((r) => r.data),
  });

  const meetings = meetingsQuery.data ?? [];
  const conversations = conversationsQuery.data ?? [];

  useEffect(() => {
    const meetingId = new URLSearchParams(window.location.search).get('meeting');
    if (meetingId) setSelected([meetingId]);
  }, []);

  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy]);

  async function loadConversation(id: string) {
    try {
      const response = await api.get(`/conversations/${id}`);
      setConversation(id);
      setMessages(response.data.messages ?? []);
      setError('');
    } catch {
      setError('Could not load that conversation.');
    }
  }

  function newConversation() {
    setConversation('');
    setMessages([]);
    setError('');
    setQuestion('');
  }

  async function removeConversation(id: string) {
    try {
      await api.delete(`/conversations/${id}`);
      if (conversation === id) newConversation();
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast('Conversation deleted.', 'ok');
    } catch {
      toast('Could not delete that conversation.', 'danger');
    }
  }

  async function send(event?: React.FormEvent | null, text?: string) {
    event?.preventDefault();
    const prompt = (text ?? question).trim();
    if (!prompt || busy) return;
    setQuestion('');
    setError('');
    setMessages((current) => [...current, { role: 'user', content: prompt }]);
    setBusy(true);
    try {
      const response = await api.post('/chat', {
        question: prompt,
        conversation_id: conversation || undefined,
        meeting_ids: selected.length ? selected : undefined,
      });
      setConversation(response.data.conversation_id);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: response.data.answer,
          citations: response.data.citations ?? [],
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (requestError: unknown) {
      const detail = (requestError as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? 'Recall could not answer. Check that the local API and Ollama are running.');
    } finally {
      setBusy(false);
    }
  }

  const scopeLabel = selected.length
    ? `${selected.length} meeting${selected.length === 1 ? '' : 's'} selected`
    : 'All meetings';

  return (
    <>
      <PageHeader
        title="Ask Recall"
        sub="Ask questions across your meeting history. Every answer cites the transcript lines it used."
      >
        <Badge tone="brand">
          <Sparkles size={12} />
          {scopeLabel}
        </Badge>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)_16rem]">
        <aside className="card card-pad">
          <div className="flex items-center justify-between">
            <h2 className="text-[0.95rem] font-semibold">Conversations</h2>
            <button
              type="button"
              className="rounded-md p-1 text-muted transition-colors hover:text-brand"
              aria-label="New conversation"
              onClick={newConversation}
            >
              <MessageSquarePlus size={16} />
            </button>
          </div>
          <div className="scroll-thin mt-3 max-h-40 space-y-1 overflow-y-auto xl:max-h-[26rem]">
            {conversations.length ? (
              conversations.map((item) => (
                <div
                  key={item.id}
                  className={`group flex items-center rounded-lg ${
                    conversation === item.id ? 'bg-brand/10' : 'hover:bg-subtle'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => loadConversation(item.id)}
                    className={`flex-1 truncate px-2.5 py-2 text-left text-sm ${
                      conversation === item.id ? 'font-medium text-brand' : 'text-muted'
                    }`}
                  >
                    {item.title}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete conversation ${item.title}`}
                    className="mr-1 rounded p-1 text-muted opacity-0 transition hover:text-danger group-hover:opacity-100"
                    onClick={() => removeConversation(item.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            ) : (
              <p className="px-2.5 py-2 text-xs text-muted">Your saved conversations appear here.</p>
            )}
          </div>
        </aside>

        <section className="card flex min-h-[32rem] flex-col overflow-hidden">
          <div ref={threadRef} className="scroll-thin flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {messages.length ? (
              messages.map((message, index) => {
                if (message.role === 'user') {
                  return (
                    <div key={index} className="flex justify-end">
                      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-brand-fg">
                        {message.content}
                      </p>
                    </div>
                  );
                }
                const citations = message.citations ?? [];
                const noEvidence = citations.length === 0 && NO_EVIDENCE.test(message.content);
                return (
                  <div key={index} className="flex gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">
                      <Sparkles size={14} />
                    </span>
                    <div
                      className={`min-w-0 flex-1 rounded-2xl rounded-tl-md px-4 py-3 ${
                        noEvidence ? 'bg-subtle text-muted' : 'bg-subtle/60'
                      }`}
                    >
                      {noEvidence ? (
                        <div className="flex items-start gap-2">
                          <SearchX size={16} className="mt-0.5 shrink-0 text-muted" />
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        </div>
                      ) : (
                        <AnswerBody content={message.content} />
                      )}
                      {citations.length > 0 && (
                        <div className="mt-3 border-t border-line pt-2.5">
                          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted">
                            Sources
                          </p>
                          <ul className="space-y-1.5">
                            {citations.map((citation, citationIndex) => (
                              <SourceLink key={citationIndex} citation={citation} />
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-6 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/12 text-brand">
                  <MessagesSquare size={22} />
                </span>
                <p className="mt-4 text-lg font-semibold">What would you like to recall?</p>
                <p className="mt-1 max-w-md text-sm text-muted">
                  Ask about decisions, owners, deadlines, or what changed between meetings.
                </p>
                <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      className="rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm transition hover:border-brand/40 hover:text-brand"
                      onClick={() => send(null, starter)}
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
                <Loader2 size={15} className="animate-spin" />
                Searching your meetings…
              </div>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </div>

          <form onSubmit={send} className="flex items-end gap-2 border-t border-line bg-surface p-4">
            <input
              aria-label="Ask a question"
              className="input flex-1"
              placeholder="Ask about decisions, tasks, or what was discussed…"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button className="btn" type="submit" disabled={busy || !question.trim()}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Ask
            </button>
          </form>
        </section>

        <aside className="card card-pad h-fit">
          <h2 className="text-[0.95rem] font-semibold">Meeting scope</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">Leave everything unchecked to search all meetings.</p>
          <div className="scroll-thin mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {meetings.length ? (
              meetings.map((meeting) => (
                <label key={meeting.id} className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-[rgb(var(--brand))]"
                    checked={selected.includes(meeting.id)}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? [...selected, meeting.id]
                          : selected.filter((id) => id !== meeting.id),
                      )
                    }
                  />
                  <span className="text-muted">{meeting.title}</span>
                </label>
              ))
            ) : (
              <Empty icon={MessagesSquare} text="No meetings yet." />
            )}
          </div>
          {selected.length > 0 && (
            <button type="button" className="btn btn-ghost mt-3 w-full" onClick={() => setSelected([])}>
              Search all meetings
            </button>
          )}
        </aside>
      </div>
    </>
  );
}
