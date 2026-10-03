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
import { verdictOf } from './verdict';

const c = palette.light; // the card always uses the light palette so it reads well anywhere

export type CardFormat = 'post' | 'story';

/** post = 4:5 for feeds and chats; story = 9:16 for Instagram/TikTok/Snapchat stories. */
export const ShareCard = forwardRef<View, { result: Result; format?: CardFormat; link?: string | null }>(function Card(
  { result, format = 'post', link },
  ref,
) {
  const story = format === 'story';
  const verdict = verdictOf(result.options);
  const winner = result.options?.find((o) => o.side === result.winner);
  const excerpt = result.summary?.majority ? result.summary.majority.slice(0, 180) : null;
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: story ? 270 : 360,
        aspectRatio: story ? 9 / 16 : 4 / 5,
        backgroundColor: c.bg,
        borderRadius: radius.xl,
        padding: space[6],
        gap: space[4],
        justifyContent: story ? 'center' : undefined,
      }}>
      {story ? (
        <Text variant="label" style={{ color: c.textMuted }}>
          I asked. {result.total_votes} people answered.
        </Text>
      ) : null}
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
      {verdict ? (
        <Text variant={story ? 'title' : 'bodyStrong'} style={{ color: c.text }}>
          {verdict}
        </Text>
      ) : null}
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
      <View style={{ flex: story ? 0 : 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c.optionA }} />
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c.optionB, marginLeft: -10 }} />
        <Text variant="label" style={{ color: c.textMuted }}>
          {link ? link.replace(/^https?:\/\//, '') : 'Made with Opinion'}
        </Text>
      </View>
    </View>
  );
});

export async function shareCard(ref: RefObject<View | null>) {
  // 1080 px wide: 1080×1350 for posts, 1080×1920 for stories.
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', width: 1080 });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share result' });
}
