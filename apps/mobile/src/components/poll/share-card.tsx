// M-04 Share card (STAGE6 §11): question, split bar, winner, AI summary excerpt, branding.
// Rendered on the device and captured as a PNG for the system share sheet.
import * as Sharing from 'expo-sharing';
import { forwardRef, type RefObject } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Text } from '@/components/ui/text';
import type { Result } from '@/lib/types';
import { palette, radius, space } from '@/theme';

import { sideColors } from './option-tile';

const c = palette.light; // the card always uses the light palette so it reads well anywhere

export const ShareCard = forwardRef<View, { result: Result }>(function Card({ result }, ref) {
  const winner = result.options?.find((o) => o.side === result.winner);
  const excerpt = result.summary?.majority ? result.summary.majority.slice(0, 180) : null;
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ width: 360, aspectRatio: 4 / 5, backgroundColor: c.bg, borderRadius: radius.xl, padding: space[6], gap: space[4] }}>
      <Text variant="question" style={{ color: c.text }}>
        {result.question}
      </Text>
      <View style={{ height: 14, flexDirection: 'row', gap: 2, borderRadius: radius.full, overflow: 'hidden' }}>
        {result.options?.map((o) => (
          <View key={o.side} style={{ flex: Math.max(Number(o.pct ?? 0), 0.5), backgroundColor: sideColors(c, o.side).strong }} />
        ))}
      </View>
      {result.options?.map((o) => (
        <Text key={o.side} variant={o.side === result.winner ? 'bodyStrong' : 'body'} style={{ color: c.text }}>
          {o.side.toUpperCase()} · {o.label ?? 'Image option'} — {Number(o.pct ?? 0).toFixed(0)}%
        </Text>
      ))}
      {winner ? (
        <Text variant="label" style={{ color: c.textMuted }}>
          {result.total_votes} people voted · {winner.label ?? `Option ${winner.side.toUpperCase()}`} won
        </Text>
      ) : null}
      {excerpt ? (
        <View style={{ backgroundColor: c.surfaceMuted, borderRadius: radius.lg, padding: space[3], gap: space[1] }}>
          <Text variant="caption" style={{ color: c.ai }}>
            AI summary
          </Text>
          <Text variant="label" style={{ color: c.text }}>
            {excerpt}
            {result.summary!.majority!.length > 180 ? '…' : ''}
          </Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c.optionA }} />
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c.optionB, marginLeft: -10 }} />
        <Text variant="label" style={{ color: c.textMuted }}>
          Made with Opinion
        </Text>
      </View>
    </View>
  );
});

export async function shareCard(ref: RefObject<View | null>) {
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', width: 1080 });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share result' });
}
