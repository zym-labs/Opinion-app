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

export const STORE = {
  ios: process.env.NEXT_PUBLIC_APP_STORE_URL || 'https://apps.apple.com/',
  android: process.env.NEXT_PUBLIC_PLAY_STORE_URL || 'https://play.google.com/store',
};
