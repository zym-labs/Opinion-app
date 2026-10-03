// Three 9:16 slides for TikTok / Instagram photo carousels: the question, the verdict with the split, and a
// voter's quote. Saved to Photos so the asker can post them as a carousel.
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import type { Result } from '@/lib/types';
import { palette, radius, space } from '@/theme';

import { sideColors } from './option-tile';
import { verdictOf } from './verdict';

const c = palette.light;

function Slide({ children, innerRef }: { children: React.ReactNode; innerRef: (v: View | null) => void }) {
  return (
    <View
      ref={innerRef}
      collapsable={false}
      style={{ width: 180, aspectRatio: 9 / 16, backgroundColor: c.bg, borderRadius: radius.lg, padding: space[4], justifyContent: 'center', gap: space[3] }}>
      {children}
      <Text variant="caption" style={{ color: c.textMuted, position: 'absolute', bottom: space[3], left: space[4] }}>
        Asked on Opinion
      </Text>
    </View>
  );
}

export function StorySlides({ result }: { result: Result }) {
  const refs = useRef<(View | null)[]>([]);
  const [msg, setMsg] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const quote = result.featured?.[0];
  const verdict = verdictOf(result.options);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await requestPermissionsAsync(true);
      if (!perm.granted) throw new Error('Allow Opinion to add photos in your phone’s settings.');
      for (const v of refs.current) {
        if (!v) continue;
        const uri = await captureRef(v, { format: 'png', quality: 1, result: 'tmpfile', width: 1080 });
        await Asset.create(uri);
      }
      track('story_shared', {});
      setMsg({ tone: 'info', text: 'Saved to Photos. Post them as a carousel on TikTok or Instagram.' });
    } catch (e) {
      setMsg({ tone: 'danger', text: e instanceof Error ? e.message : 'Could not save' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space[3] }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[3] }}>
        <Slide innerRef={(v) => (refs.current[0] = v)}>
          <Text variant="label" style={{ color: c.textMuted }}>
            I asked {result.total_votes} people
          </Text>
          <Text variant="title" style={{ color: c.text }}>
            {result.question}
          </Text>
        </Slide>
        <Slide innerRef={(v) => (refs.current[1] = v)}>
          {verdict ? (
            <Text variant="title" style={{ color: c.text }}>
              {verdict}
            </Text>
          ) : null}
          {result.options?.map((o) => (
            <View key={o.side} style={{ gap: 4 }}>
              <Text variant="label" style={{ color: c.text }}>
                {o.label ?? `Option ${o.side.toUpperCase()}`} · {Number(o.pct ?? 0).toFixed(0)}%
              </Text>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceMuted }}>
                <View style={{ width: `${Number(o.pct ?? 0)}%`, height: 8, borderRadius: 4, backgroundColor: sideColors(c, o.side).strong }} />
              </View>
            </View>
          ))}
        </Slide>
        {quote ? (
          <Slide innerRef={(v) => (refs.current[2] = v)}>
            <Text variant="label" style={{ color: c.textMuted }}>
              In their own words
            </Text>
            <Text variant="quote" style={{ color: c.text }}>
              “{quote.quote}”
            </Text>
          </Slide>
        ) : null}
      </ScrollView>
      <Button label="Save story slides to Photos" variant="secondary" loading={busy} onPress={save} />
      {msg ? <Banner tone={msg.tone} message={msg.text} /> : null}
    </View>
  );
}
