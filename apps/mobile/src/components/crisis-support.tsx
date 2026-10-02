// Crisis safety net: shown instead of posting when a question or reason mentions self-harm.
// Opinion is not a crisis service, so we point to people who are, right away.
import { getLocales } from 'expo-localization';
import * as WebBrowser from 'expo-web-browser';
import { Linking, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { radius, space, useColors } from '@/theme';

type Line = { name: string; call?: string; text?: string };

const LINES: Record<string, Line> = {
  US: { name: '988 Suicide & Crisis Lifeline', call: '988', text: '988' },
  CA: { name: '9-8-8 Suicide Crisis Helpline', call: '988', text: '988' },
  GB: { name: 'Samaritans', call: '116123' },
  IE: { name: 'Samaritans', call: '116123' },
  AU: { name: 'Lifeline', call: '131114' },
  NZ: { name: 'Need to talk?', call: '1737', text: '1737' },
  IN: { name: 'Tele-MANAS', call: '14416' },
};

export function CrisisSupport({ onClose }: { onClose?: () => void }) {
  const c = useColors();
  const region = getLocales()[0]?.regionCode ?? '';
  const line = LINES[region];
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: space[4], gap: space[3] }}>
      <Text variant="question">You don’t have to decide this alone</Text>
      <Text tone="muted">
        It sounds like you might be going through something really hard. A poll isn’t the right place for this, but
        talking to someone can help, right now, for free.
      </Text>
      {line?.call ? <Button label={`Call ${line.name} (${line.call})`} onPress={() => Linking.openURL(`tel:${line.call}`)} /> : null}
      {line?.text ? (
        <Button label={`Text ${line.text}`} variant="secondary" onPress={() => Linking.openURL(`sms:${line.text}`)} />
      ) : null}
      <Button
        label={line ? 'Other helplines' : 'Find a helpline near you'}
        variant={line ? 'ghost' : 'primary'}
        onPress={() => WebBrowser.openBrowserAsync('https://findahelpline.com')}
      />
      <Text variant="caption" tone="faint">
        If you’re in immediate danger, call your local emergency number.
      </Text>
      {onClose ? <Button label="Go back" variant="ghost" onPress={onClose} /> : null}
    </View>
  );
}
