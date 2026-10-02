// A one-glance verdict from the split, so a result reads like an answer (cf. AITA's verdicts).
import type { Result } from '@/lib/types';

export function verdictOf(options: Result['options']): string | null {
  const pcts = (options ?? []).map((o) => ({ label: o.label ?? `Option ${o.side.toUpperCase()}`, pct: Number(o.pct ?? 0) }));
  if (pcts.length < 2) return null;
  pcts.sort((x, y) => y.pct - x.pct);
  const margin = pcts[0].pct - pcts[1].pct;
  if (margin < 1) return 'It depends: a dead heat';
  if (margin < 10) return 'Split decision';
  if (margin < 30) return `Leaning ${pcts[0].label}`;
  return `Clear call: ${pcts[0].label}`;
}
