'use client';

// AD-10 Daily question: one shared poll a day for everyone, live 00:00–24:00 UTC. Write them ahead.
import { useState } from 'react';

import { rpc } from '@/lib/supabase';

import { useRpc } from '../use-rpc';

type Row = { poll_id: string; day: string; question: string; status: string; vote_count: number };

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

export default function Daily() {
  const { data, error, reload } = useRpc<Row[]>('admin_daily_questions');
  const [day, setDay] = useState(tomorrow);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    try {
      await rpc('admin_schedule_daily', {
        p_day: day,
        p_question: question.trim(),
        p_labels: options.map((o) => o.trim()).filter(Boolean),
      });
      setQuestion('');
      setOptions(['', '']);
      setMsg(`Scheduled for ${day}.`);
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Daily question</h1>
      <p className="muted">
        Light, universal questions work best (“Coffee or tea?”, “Text back right away or wait?”). Avoid anything that
        needs expertise or touches sensitive topics. Scheduling a day again replaces its draft.
      </p>
      {error && <p className="error">{error}</p>}
      <form className="card stack" style={{ maxWidth: 560 }} onSubmit={(e) => (e.preventDefault(), save())}>
        <label className="stack">
          Day (UTC)
          <input type="date" value={day} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label className="stack">
          Question
          <input value={question} maxLength={120} onChange={(e) => setQuestion(e.target.value)} />
        </label>
        {options.map((o, i) => (
          <label key={i} className="stack">
            Option {String.fromCharCode(65 + i)}
            <input value={o} maxLength={60} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} />
          </label>
        ))}
        <div className="row">
          {options.length < 4 && (
            <button type="button" onClick={() => setOptions([...options, ''])}>
              Add option
            </button>
          )}
          <button className="primary" disabled={question.trim().length < 5 || options.filter((o) => o.trim()).length < 2}>
            Schedule
          </button>
        </div>
        {msg && <p className="muted">{msg}</p>}
      </form>
      {data && data.length > 0 && (
        <table className="data">
          <thead>
            <tr>
              <th>Day</th>
              <th>Question</th>
              <th>Status</th>
              <th>Votes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.poll_id}>
                <td>{r.day}</td>
                <td>{r.question}</td>
                <td>{r.status === 'draft' ? 'scheduled' : r.status}</td>
                <td>{r.vote_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
