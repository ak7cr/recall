import axios from 'axios';

// Requests go through the Vite proxy in development, so the app works on any
// dev port without CORS configuration. Set VITE_API_URL to target a remote API.
const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({ baseURL });

export type MeetingStatus = 'uploaded' | 'processing' | 'ready' | 'failed';
export type ActionStatus = 'pending' | 'in_progress' | 'done';

export type Participant = {
  speaker_name: string;
  utterance_count: number;
  word_count: number;
};

export type Summary = { method: string; summary_text: string; is_primary: boolean };
export type Topic = { topic: string; score?: number };
export type Entity = { text: string; label: string; utterance_idx: number };

export type MeetingListItem = {
  id: string;
  title: string;
  meeting_date: string;
  status: MeetingStatus;
  participants: number;
  actions: number;
  decisions: number;
};

export type Meeting = {
  id: string;
  title: string;
  meeting_date: string;
  source_filename?: string;
  status: MeetingStatus;
  error_message?: string | null;
  processing_metadata?: Record<string, unknown> | null;
  created_at?: string;
  summaries?: Summary[];
  topics?: Topic[];
  participants?: Participant[];
  entities?: Entity[];
  decisions?: Decision[];
  action_items?: Action[];
};

export type Action = {
  id: string;
  meeting_id: string;
  task: string;
  assignee?: string | null;
  deadline_text?: string | null;
  deadline_date?: string | null;
  status: ActionStatus | string;
  evidence_quote: string;
  evidence_utterance_idx: number;
  assignee_explicit: boolean;
  deadline_explicit: boolean;
  extraction_method?: string;
};

export type Decision = {
  id: string;
  meeting_id?: string;
  decision: string;
  topic?: string | null;
  status: 'active' | 'superseded' | string;
  evidence_quote: string;
  evidence_utterance_idx: number;
  extraction_method?: string;
};

export type Utterance = { idx: number; speaker: string; text: string; start_ts?: number | null };

export type Citation = {
  meeting_id: string;
  meeting_title: string;
  meeting_date: string;
  utterance_start_idx: number;
  utterance_end_idx: number;
  snippet?: string;
};

export type ChatMessage = { role: 'user' | 'assistant'; content: string; citations?: Citation[] };

export type ChatResponse = {
  conversation_id: string;
  answer: string;
  citations: Citation[];
  generation_status?: string;
  retrieval_mode?: string;
};

export type Conversation = { id: string; title: string; created_at?: string };

export type Dashboard = {
  totals: {
    meetings?: number;
    pending_actions?: number;
    done_actions?: number;
    overdue_actions?: number;
    active_decisions?: number;
  };
  upcoming_deadlines: {
    id: string;
    task: string;
    assignee?: string | null;
    deadline_date: string;
    meeting_id: string;
  }[];
  recent_meetings: { id: string; title: string; meeting_date: string; status: MeetingStatus }[];
  recent_decisions: { decision: string; meeting_id: string }[];
  actions_by_assignee: { assignee: string; count: number }[];
  meetings_per_week: { week: string; count: number }[];
};

export type CompareResult = { comparison: string; meetings: Meeting[] };
