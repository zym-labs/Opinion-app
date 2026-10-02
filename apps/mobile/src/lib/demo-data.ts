// Sample data for the screenshot/demo mode (development builds only). Not real users or votes.
import type { FeedPoll, Result } from './types';

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

export const DEMO_FEED: FeedPoll[] = [
  {
    id: 'demo-1',
    type: 'expert',
    is_taste: false,
    question: 'MacBook Air or ThinkPad X1 for a CS degree?',
    closes_at: inHours(4.2),
    target_label: 'Tech',
    is_sensitive: false,
    options: [
      { side: 'a', label: 'MacBook Air', image_path: null },
      { side: 'b', label: 'ThinkPad X1', image_path: null },
    ],
  },
  {
    id: 'demo-2',
    type: 'community',
    is_taste: false,
    question: 'Library or café for a full study day?',
    closes_at: inHours(0.6),
    target_label: 'Student budget',
    is_sensitive: false,
    options: [
      { side: 'a', label: 'Library', image_path: null },
      { side: 'b', label: 'Café', image_path: null },
    ],
  },
  {
    id: 'demo-4',
    type: 'expert',
    is_taste: false,
    question: 'Best summer plan before final year?',
    closes_at: inHours(7.5),
    target_label: 'Career',
    is_sensitive: false,
    options: [
      { side: 'a', label: 'Internship', image_path: null },
      { side: 'b', label: 'Travel', image_path: null },
      { side: 'c', label: 'Summer course', image_path: null },
    ],
  },
  {
    id: 'demo-3',
    type: 'expert',
    is_taste: true,
    question: 'Navy or black suit for graduation?',
    closes_at: inHours(11),
    target_label: 'Fashion',
    is_sensitive: false,
    options: [
      { side: 'a', label: 'Navy', image_path: null },
      { side: 'b', label: 'Black', image_path: null },
    ],
  },
];

export const DEMO_RESULT: Result = {
  poll_id: 'demo-1',
  question: 'MacBook Air or ThinkPad X1 for a CS degree?',
  state: 'ready',
  total_votes: 37,
  options: [
    { side: 'a', label: 'MacBook Air', image_path: null, pct: 62 },
    { side: 'b', label: 'ThinkPad X1', image_path: null, pct: 38 },
  ],
  winner: 'a',
  you: { side: 'a', in_majority: true, predicted_correctly: true },
  summary: {
    majority: 'Battery life gets people through full days of labs. Resale value makes it cheaper over the degree.',
    minority: 'Linux support and the keyboard matter more for systems programming.',
    label: 'AI-generated from voters’ reasons. May be inaccurate.',
    disclaimer: null,
    points: [
      { side: 'a', text: 'Battery lasts a full day of lectures and labs without hunting for sockets.', reason_count: 9, quote_ids: ['q1'] },
      { side: 'a', text: 'Strong resale value makes it cheaper over a three-year degree.', reason_count: 5, quote_ids: [] },
      { side: 'b', text: 'Better Linux support for systems programming modules.', reason_count: 6, quote_ids: ['q3'] },
      { side: 'b', text: 'The keyboard is easier on long coding sessions.', reason_count: 4, quote_ids: [] },
    ],
  },
  featured: [
    { id: 'q1', quote: 'I code on the train between campuses and it never dies before I get home.', side: 'a' },
    { id: 'q2', quote: 'Silent, light, and it still runs everything my modules need.', side: 'a' },
    { id: 'q3', quote: 'Half our labs assume Linux. Fighting the OS every week gets old fast.', side: 'b' },
  ],
  reason_count: 31,
  view_once: true,
};
