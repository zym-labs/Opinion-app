// Report sheet + hide creator (STAGE1 §8).
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorMessage, rpc } from '@/lib/api';
import { keys } from '@/lib/queries';
import { space } from '@/theme';

const REASONS = [
  ['spam', 'Spam or advertising'],
  ['hate', 'Hate'],
  ['harassment', 'Harassment or bullying'],
  ['personal_info', 'Personal information'],
  ['sexual', 'Sexual content'],
  ['self_harm', 'Self-harm or suicide'],
  ['other', 'Something else'],
] as const;

// Replace with region-appropriate resources before launch.
const SUPPORT_URL = 'https://findahelpline.com';

export default function Report() {
  const { target, id, hide } = useLocalSearchParams<{ target: 'poll' | 'reason' | 'featured_insight'; id: string; hide?: string }>();
  const qc = useQueryClient();
  const [reason, setReason] = useState<(typeof REASONS)[number][0] | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [hidden, setHidden] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await rpc('submit_report', { p_target: target, p_target_id: id, p_reason: reason, p_note: note || null });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function hideCreator() {
    try {
      await rpc('hide_creator', { p_poll: id });
      setHidden(true);
      qc.invalidateQueries({ queryKey: keys.feed });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (sent) {
    return (
      <Screen>
        <Text variant="title">Thanks for reporting</Text>
        <Text tone="muted">We review reports within 24 hours. We won’t tell anyone you reported this.</Text>
        {reason === 'self_harm' ? (
          <>
            <Banner tone="warning" message="If you or someone else is in danger, contact local emergency services now." />
            <Button label="Find a helpline" onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URL)} />
          </>
        ) : null}
        {hide && !hidden ? (
          <Button label="Also hide polls from this creator" variant="secondary" onPress={hideCreator} />
        ) : null}
        {hidden ? <Banner message="You won’t see this creator’s polls. Undo in Settings → Hidden creators." /> : null}
        <Button label="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="question">What’s wrong?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {REASONS.map(([value, label]) => (
          <Chip key={value} label={label} selected={reason === value} onPress={() => setReason(value)} />
        ))}
      </View>
      <TextField label="Anything to add? (optional)" value={note} onChangeText={(t) => setNote(t.slice(0, 300))} multiline />
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label="Send report" disabled={!reason} loading={busy} onPress={submit} />
      {hide ? (
        hidden ? (
          <Banner message="You won’t see this creator’s polls." />
        ) : (
          <Button label="Just hide this creator’s polls" variant="ghost" onPress={hideCreator} />
        )
      ) : null}
    </Screen>
  );
}
