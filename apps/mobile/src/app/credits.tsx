// Explains vote-to-ask credits (SPEC: Polls).
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorMessage, rpc } from '@/lib/api';
import { keys, useCredits } from '@/lib/queries';

export default function Credits() {
  const { data } = useCredits();
  const progress = (data?.units ?? 0) % 3;
  return (
    <Screen>
      <Text variant="display">{data?.polls_available ?? 0}</Text>
      <Text variant="question">{data?.polls_available === 1 ? 'poll you can post' : 'polls you can post'}</Text>
      <Text tone="muted">Every 3 votes you give earns 1 poll. You’re {progress}/3 of the way to the next one.</Text>
      <Text tone="muted">New accounts start with one free poll. Credits from votes count once your account is a day old.</Text>
      <Text tone="muted">Invite friends from your profile: when one joins and votes 3 times, you both get a poll.</Text>
      <FriendCode />
      <Button label="Got it" onPress={() => router.back()} />
    </Screen>
  );
}

/** New accounts (first 7 days) can enter a friend's invite code by hand. */
function FriendCode() {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);
  async function redeem() {
    try {
      await rpc('redeem_referral', { p_code: code.trim() });
      setMsg({ tone: 'info', text: 'Code accepted. Vote on 3 polls and you both get a free poll.' });
      qc.invalidateQueries({ queryKey: keys.credits });
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) });
    }
  }
  return (
    <>
      <TextField label="Friend’s invite code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} />
      {msg ? <Banner tone={msg.tone} message={msg.text} /> : null}
      <Button label="Use code" variant="secondary" disabled={code.trim().length < 6} onPress={redeem} />
    </>
  );
}
