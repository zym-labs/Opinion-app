// S-08 Change sign-in email. Supabase emails a confirmation link; the change applies once confirmed.
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function ChangeEmail() {
  const current = useQuery({ queryKey: ['auth-email'], queryFn: async () => (await supabase.auth.getSession()).data.session?.user.email ?? null });
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'danger' | 'info'; text: string } | null>(null);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().toLowerCase() !== current.data?.toLowerCase();

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      setMsg({ tone: 'info', text: `Check ${email.trim()} for a confirmation link. Your email changes once you confirm.` });
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text tone="muted">Current: {current.data ?? '…'}</Text>
      <TextField
        label="New email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        onSubmitEditing={() => valid && save()}
      />
      {msg ? <Banner tone={msg.tone} message={msg.text} /> : null}
      <Button label="Send confirmation link" loading={busy} disabled={!valid} onPress={save} />
    </Screen>
  );
}
