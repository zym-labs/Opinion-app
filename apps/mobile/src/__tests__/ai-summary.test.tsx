import { fireEvent, render, screen } from '@testing-library/react-native';

import { AISummary } from '@/components/poll/ai-summary';
import type { Result } from '@/lib/types';

const base: Result = {
  poll_id: 'p1',
  question: 'Library or café?',
  state: 'ready',
  total_votes: 20,
  options: [
    { side: 'a', label: 'Library', image_path: null, pct: 65 },
    { side: 'b', label: 'Café', image_path: null, pct: 35 },
  ],
  winner: 'a',
  summary: {
    majority: 'Quiet and free.',
    minority: 'Feels social.',
    label: 'AI',
    disclaimer: null,
    points: [
      { side: 'a', text: 'Quiet floors help focus.', reason_count: 4, quote_ids: ['f1'] },
      { side: 'b', text: 'Cafés feel more social.', reason_count: 3, quote_ids: [] },
    ],
  },
  featured: [{ id: 'f1', quote: 'Silence is everything at exam time', side: 'a' }],
  reason_count: 12,
};

describe('AISummary', () => {
  it('labels the summary with the number of reasons', async () => {
    await render(<AISummary result={base} />);
    expect(screen.getByText('Written by AI from 12 voters’ reasons')).toBeTruthy();
  });

  it('shows majority and minority points with their evidence', async () => {
    await render(<AISummary result={base} />);
    expect(screen.getByText('• Quiet floors help focus.')).toBeTruthy();
    expect(screen.getByText('• Cafés feel more social.')).toBeTruthy();
    expect(screen.getByText('From 4 reasons')).toBeTruthy();
  });

  it('opens the voter’s own words from a quote chip', async () => {
    await render(<AISummary result={base} />);
    expect(screen.queryByText('“Silence is everything at exam time”')).toBeNull();
    await fireEvent.press(screen.getByText('Quote 1'));
    expect(screen.getByText('“Silence is everything at exam time”')).toBeTruthy();
  });

  it('warns when few reasons were given', async () => {
    await render(<AISummary result={{ ...base, reason_count: 3 }} />);
    expect(screen.getByText(/Only a few reasons were given/)).toBeTruthy();
  });

  it('shows a pending state while the AI is still writing', async () => {
    await render(<AISummary result={{ ...base, state: 'summary_pending', summary: null }} />);
    expect(screen.getByText('The AI is reading 12 reasons. Check back in a minute.')).toBeTruthy();
  });
});

describe('AISummary with three options', () => {
  it('groups every non-winning option into "Others said"', async () => {
    const three: Result = {
      ...base,
      options: [...base.options!, { side: 'c', label: 'Home', image_path: null, pct: 10 }],
      summary: {
        ...base.summary!,
        points: [
          { side: 'a', text: 'Quiet floors help focus.', reason_count: 4, quote_ids: [] },
          { side: 'b', text: 'Cafés feel more social.', reason_count: 3, quote_ids: [] },
          { side: 'c', text: 'Home has no commute.', reason_count: 2, quote_ids: [] },
        ],
      },
    };
    await render(<AISummary result={three} />);
    expect(screen.getByText('Others said · Café, Home')).toBeTruthy();
    expect(screen.getByText('• Home has no commute.')).toBeTruthy();
  });
});
