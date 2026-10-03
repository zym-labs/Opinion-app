// Server-side calls to public (anon) RPCs for link previews. No session, no cookies.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'missing-key';

export type InvitePreview = { question: string; closes_at: string; options: { side: string; label: string | null }[] };

export async function getInvitePreview(code: string): Promise<InvitePreview | null> {
  if (!/^[A-Za-z0-9]{6,16}$/.test(code)) return null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_invite_preview`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code }),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as InvitePreview[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export type PublicResult = {
  question: string;
  state: string;
  total_votes: number;
  winner: string | null;
  options: { side: string; label: string | null; pct: number | null }[];
  summary: { majority: string | null; minority: string | null; label: string; disclaimer: string | null } | null;
  featured: { id: string; quote: string; side: string }[];
};

export async function getPublicResult(code: string): Promise<PublicResult | null> {
  if (!/^[A-Za-z0-9]{6,16}$/.test(code)) return null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_public_result`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return ((await res.json()) as PublicResult | null) ?? null;
  } catch {
    return null;
  }
}

export type Transparency = {
  period_days: number;
  polls_published: number;
  reports: number;
  actions: Record<string, number>;
  appeals: number;
  appeals_reversed: number;
  median_hours_to_action: number | null;
  summaries_flagged: number;
  generated_at: string;
};

export async function getTransparency(): Promise<Transparency | null> {
  try {
    const res = await fetch(`${url}/rest/v1/rpc/public_transparency_stats`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: '{}',
      next: { revalidate: 3600 },
    });
    return res.ok ? ((await res.json()) as Transparency) : null;
  } catch {
    return null;
  }
}

export const STORE = {
  ios: process.env.NEXT_PUBLIC_APP_STORE_URL || 'https://apps.apple.com/',
  android: process.env.NEXT_PUBLIC_PLAY_STORE_URL || 'https://play.google.com/store',
};
