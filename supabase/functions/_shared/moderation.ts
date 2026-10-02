// Content checks before anything is shown or summarized (SPEC: Voting, Safety).

export type ModerationResult = { state: 'approved' | 'rejected'; flags: Record<string, unknown> | null };

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');

type Input = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

/** OpenAI omni-moderation (free). Without a key (local dev) content is approved. */
export async function moderate(inputs: Input[]): Promise<ModerationResult> {
  if (inputs.length === 0) return { state: 'approved', flags: null };
  if (!OPENAI_KEY) {
    console.warn('OPENAI_API_KEY not set: skipping moderation');
    return { state: 'approved', flags: null };
  }
  const res = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'omni-moderation-latest', input: inputs }),
  });
  if (!res.ok) throw new Error(`moderation failed: ${res.status}`);
  const data = await res.json();
  const results = data.results as { flagged: boolean; categories: Record<string, boolean> }[];
  const flagged = results.some((r) => r.flagged);
  return {
    state: flagged ? 'rejected' : 'approved',
    flags: flagged ? Object.assign({}, ...results.map((r) => r.categories)) : null,
  };
}

export const moderateText = (...texts: (string | null | undefined)[]) =>
  moderate(texts.filter((t): t is string => !!t?.trim()).map((text) => ({ type: 'text', text })));

// Personal details are removed before reasons reach the AI or get featured (STAGE4 §5).
const PII = [
  /[\w.+-]+@[\w-]+\.[\w.-]+/g, // emails
  /(?:\+?\d[\s().-]?){7,}\d/g, // phone numbers
  /https?:\/\/\S+|www\.\S+/gi, // links
  /(^|\s)@[\w.]{2,}/g, // @handles
];

export function redactPii(text: string) {
  return PII.reduce((t, re) => t.replace(re, (m) => (m.startsWith(' ') ? ' ' : '') + '[removed]'), text);
}

const INJECTION = /\b(ignore|disregard|forget)\b.{0,30}\b(previous|above|prior|all)\b.{0,30}\b(instructions?|prompts?|rules?)\b|\bsystem prompt\b|<\/?reason|\byou are (now )?(an? )?(ai|assistant|model)\b/i;

export const looksLikeInjection = (text: string) => INJECTION.test(text);
