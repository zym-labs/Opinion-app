import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DecisionCard } from '@/components/poll/decision-card';
import { supabase } from '@/lib/supabase';
import type { MyPoll } from '@/lib/types';

const poll: MyPoll = {
  id: 'p1', question: 'Laptop or tablet?', type: 'expert', status: 'completed', vote_count: 20,
  closes_at: null, created_at: '2026-10-01T00:00:00Z', removed_reason: null,
};
const options = [
  { side: 'a' as const, label: 'Laptop', image_path: null },
  { side: 'b' as const, label: 'Tablet', image_path: null },
];
const wrap = (ui: React.ReactElement) => <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;

describe('DecisionCard', () => {
  it('asks for a decision and sends the chosen option', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: null });
    await render(wrap(<DecisionCard poll={poll} options={options} />));
    await fireEvent.press(screen.getByText('B · Tablet'));
    await fireEvent.press(screen.getByText('Share my decision'));
    expect(supabase.rpc).toHaveBeenCalledWith('record_decision', { p_poll: 'p1', p_side: 'b', p_helpful: null });
  });

  it('sends null for "None of these"', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: null });
    await render(wrap(<DecisionCard poll={poll} options={options} />));
    await fireEvent.press(screen.getByText('None of these'));
    await fireEvent.press(screen.getByText('Share my decision'));
    expect(supabase.rpc).toHaveBeenLastCalledWith('record_decision', { p_poll: 'p1', p_side: null, p_helpful: null });
  });

  it('shows the recorded decision', async () => {
    await render(wrap(<DecisionCard poll={{ ...poll, decided_at: '2026-10-02T00:00:00Z', decision_side: 'a' }} options={options} />));
    expect(screen.getByText('Laptop')).toBeTruthy();
  });
});
