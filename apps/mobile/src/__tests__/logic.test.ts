import { buildCards } from '@/components/poll/result-story';
import { timeLeft } from '@/components/poll/countdown';
import { ApiError, callFunction, errorMessage, rpc } from '@/lib/api';
import { isAdult } from '@/lib/pending-age';
import { supabase } from '@/lib/supabase';
import type { Result } from '@/lib/types';

const result = (over: Partial<Result> = {}): Result => ({
  poll_id: 'p1',
  question: 'MacBook or ThinkPad?',
  state: 'ready',
  total_votes: 20,
  options: [
    { side: 'a', label: 'MacBook', image_path: null, pct: 65 },
    { side: 'b', label: 'ThinkPad', image_path: null, pct: 35 },
  ],
  winner: 'a',
  you: { side: 'b', in_majority: false, predicted_correctly: true },
  summary: { majority: 'Battery.', minority: 'Linux.', label: 'AI', disclaimer: null, points: [] },
  featured: [{ id: 'f1', quote: 'Battery lasts all day', side: 'a' }],
  reason_count: 12,
  view_once: true,
  ...over,
});

describe('timeLeft', () => {
  const now = Date.parse('2026-10-02T12:00:00Z');
  it('formats hours and minutes', () => expect(timeLeft('2026-10-02T14:30:00Z', now)).toBe('2h 30m'));
  it('shows at least 1 minute', () => expect(timeLeft('2026-10-02T12:00:20Z', now)).toBe('1m'));
  it('is null once closed', () => expect(timeLeft('2026-10-02T11:59:00Z', now)).toBeNull());
});

describe('isAdult', () => {
  const year = new Date().getFullYear();
  it('accepts 18+', () => expect(isAdult(year - 18)).toBe(true));
  it('rejects under 18', () => expect(isAdult(year - 17)).toBe(false));
});

describe('API errors', () => {
  it('maps database error codes to friendly messages', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'ALREADY_VOTED' } });
    await expect(rpc('x')).rejects.toMatchObject({ code: 'ALREADY_VOTED' });
    expect(errorMessage(new ApiError('ALREADY_VOTED'))).toBe('You’ve already voted on this poll.');
  });
  it('hides raw errors behind INTERNAL', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'relation "x" does not exist' } });
    await expect(rpc('x')).rejects.toMatchObject({ code: 'INTERNAL' });
    expect(errorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
  it('signed calls send the exact JSON string with integrity headers', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: { id: 'u1' } } });
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({ data: { ok: true }, error: null });
    await callFunction('votes', { poll_id: 'p1', side: 'a' }, { signed: true });
    const [, opts] = (supabase.functions.invoke as jest.Mock).mock.calls.at(-1);
    expect(opts.body).toBe('{"poll_id":"p1","side":"a"}');
    expect(opts.headers['X-Integrity-Platform']).toBe('test');
  });
});

describe('result story cards', () => {
  const keys = (r: Result, starter = false) => buildCards(r, '#999', starter).map((c) => c.key);
  it('runs sealed → pick → split → AI → quotes → end for voters', () =>
    expect(keys(result())).toEqual(['sealed', 'pick', 'split', 'ai', 'quotes', 'end']));
  it('skips quotes when none are featured', () => expect(keys(result({ featured: [] }))).not.toContain('quotes'));
  it('skips the AI card when the summary failed and nobody gave reasons', () =>
    expect(keys(result({ state: 'summary_failed', reason_count: 0 }))).not.toContain('ai'));
  it('every card has a full screen-reader label', () =>
    buildCards(result(), '#999', false).forEach((c) => expect(c.label.length).toBeGreaterThan(20)));
  it('split label names the voter’s pick and the minority outcome', () => {
    const split = buildCards(result(), '#999', false).find((c) => c.key === 'split')!;
    expect(split.label).toContain('ThinkPad, 35 percent, your pick');
    expect(split.label).toContain('differently from most people');
  });
});

describe('multi-option results', () => {
  const three = result({
    options: [
      { side: 'a', label: 'MacBook', image_path: null, pct: 30 },
      { side: 'b', label: 'ThinkPad', image_path: null, pct: 20 },
      { side: 'c', label: 'Dell XPS', image_path: null, pct: 50 },
    ],
    winner: 'c',
    you: { side: 'a', in_majority: false, predicted_correctly: false },
  });
  it('lists every option on the split card', () => {
    const split = buildCards(three, '#999', false).find((c) => c.key === 'split')!;
    expect(split.label).toContain('Option C, Dell XPS, 50 percent');
    expect(split.label).toContain('Option A, MacBook, 30 percent, your pick');
  });
});
