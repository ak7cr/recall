import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './ui';
import { api } from './api';
import { deadlineTone, relativeDeadline } from './format';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

function page(path: string, getData: (url: string) => unknown) {
  vi.spyOn(api, 'get').mockImplementation((url: string) => Promise.resolve({ data: getData(url) }) as never);
  render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={new QueryClient()}>
        <App />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('Recall page smoke tests', () => {
  it('renders dashboard', () => {
    page('/', () => ({
      totals: {},
      upcoming_deadlines: [],
      recent_meetings: [],
      recent_decisions: [],
      actions_by_assignee: [],
      meetings_per_week: [],
    }));
    expect(screen.getByText('Meeting activity')).toBeInTheDocument();
  });

  it('renders upload page', () => {
    page('/upload', () => []);
    expect(screen.getByText('Add meetings')).toBeInTheDocument();
  });

  it('renders a meeting workspace', async () => {
    page('/meetings/m1', (url: string) =>
      url === '/meetings/m1'
        ? {
            id: 'm1',
            title: 'Design review',
            meeting_date: '2024-11-12',
            status: 'ready',
            summaries: [],
            topics: [],
            entities: [],
            decisions: [],
            action_items: [],
            participants: [],
          }
        : [{ idx: 1, speaker: 'Rahul', text: 'Hello' }],
    );
    expect(await screen.findByText('Design review')).toBeInTheDocument();
  });

  it('renders chat prompts', () => {
    page('/chat', () => []);
    expect(screen.getByText('What would you like to recall?')).toBeInTheDocument();
  });

  it('links chat citations to the cited transcript line', async () => {
    page('/chat', () => []);
    vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        conversation_id: 'c1',
        answer: 'PostgreSQL was selected.',
        citations: [
          {
            meeting_id: 'm1',
            meeting_title: 'Architecture review',
            meeting_date: '2024-11-12',
            utterance_start_idx: 7,
            utterance_end_idx: 7,
            snippet: 'We chose PostgreSQL.',
          },
        ],
      },
    } as never);
    fireEvent.change(screen.getByLabelText('Ask a question'), {
      target: { value: 'What database did we choose?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByRole('link', { name: /Architecture review · lines 7/ })).toHaveAttribute(
      'href',
      '/meetings/m1?line=7',
    );
  });

  it('renders action tracker', () => {
    page('/actions', () => []);
    expect(screen.getByRole('heading', { name: 'Action tracker', level: 1 })).toBeInTheDocument();
  });

  it('toggles and persists the colour scheme', () => {
    page('/', () => ({
      totals: {},
      upcoming_deadlines: [],
      recent_meetings: [],
      recent_decisions: [],
      actions_by_assignee: [],
      meetings_per_week: [],
    }));
    const toggle = screen.getAllByRole('button', { name: 'Switch to dark theme' })[0];
    fireEvent.click(toggle);
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('recall-theme')).toBe('dark');
    fireEvent.click(screen.getAllByRole('button', { name: 'Switch to light theme' })[0]);
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('recall-theme')).toBe('light');
  });

  it('opens the mobile navigation drawer', () => {
    page('/', () => ({
      totals: {},
      upcoming_deadlines: [],
      recent_meetings: [],
      recent_decisions: [],
      actions_by_assignee: [],
      meetings_per_week: [],
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation' }));
    expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument();
  });
});

describe('deadline formatting', () => {
  const iso = (offsetDays: number) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };

  it('describes upcoming, due, and overdue deadlines', () => {
    expect(relativeDeadline(iso(0))).toBe('Due today');
    expect(relativeDeadline(iso(1))).toBe('Due tomorrow');
    expect(relativeDeadline(iso(5))).toBe('Due in 5 days');
    expect(relativeDeadline(iso(-2))).toBe('2 days overdue');
    expect(relativeDeadline(iso(-90))).toBe('Overdue');
    expect(relativeDeadline(null)).toBe('No deadline');
  });

  it('assigns a tone for deadline urgency', () => {
    expect(deadlineTone(iso(-1))).toBe('danger');
    expect(deadlineTone(iso(2))).toBe('warn');
    expect(deadlineTone(iso(20))).toBe('neutral');
    expect(deadlineTone(iso(-20), 'done')).toBe('ok');
    expect(deadlineTone(null)).toBe('neutral');
  });
});
