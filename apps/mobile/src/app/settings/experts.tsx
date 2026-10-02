// Verify expertise (roadmap: verified experts). A work or university email on an allow-listed
// domain marks you as a verified expert in that category. Your address is never shown.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { callFunction, errorMessage, rpc } from '@/lib/api';
import { radius, space, useColors } from '@/theme';

type Option = { category_id: number; name: string; domains: { domain: string; label: string }[]; verified_until: string | null };

function VerifyCategory({ option, onDone }: { option: Option; onDone: () => void }) {
  const c = useColors();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: space[4], gap: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {option.name}
        </Text>
        {option.verified_until ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
            <BadgeCheck size={18} strokeWidth={1.75} color={c.success} />
            <Text variant="label" style={{ color: c.success }}>
              Verified
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="label" tone="muted">
        Accepted: {option.domains.map((d) => (d.label ? `${d.label} (${d.domain})` : d.domain)).join(', ')}
      </Text>
      {option.verified_until ? (
        <Text variant="caption" tone="faint">
          Valid until {new Date(option.verified_until).toLocaleDateString()}.
        </Text>
      ) : !open ? (
        <Button label="Verify" variant="secondary" onPress={() => setOpen(true)} />
      ) : !sent ? (
        <>
          <TextField label="Work or university email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Button
            label="Send code"
            loading={busy}
            onPress={() =>
              run(async () => {
                await callFunction('expert-verify', { action: 'send', category_id: option.category_id, email });
                setSent(true);
              })
            }
          />
        </>
      ) : (
        <>
          <TextField
            label="6-digit code"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
          />
          <Button
            label="Confirm"
            loading={busy}
            onPress={() =>
              run(async () => {
                await callFunction('expert-verify', { action: 'verify', category_id: option.category_id, code });
                onDone();
              })
            }
          />
        </>
      )}
      {error ? <Banner tone="danger" message={error} /> : null}
    </View>
  );
}

export default function Experts() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['expert-options'], queryFn: () => rpc<Option[]>('my_expert_options') });

  return (
    <Screen>
      <Text tone="muted">
        Verified experts are counted separately in results (“Verified experts: 70% A”), only when at least 10 of them
        voted. Nobody sees who you are or your email; we keep only a scrambled version to stop it being reused.
      </Text>
      {q.data?.length ? (
        q.data.map((o) => (
          <VerifyCategory key={o.category_id} option={o} onDone={() => qc.invalidateQueries({ queryKey: ['expert-options'] })} />
        ))
      ) : q.isLoading ? null : (
        <EmptyState
          title="Nothing to verify yet"
          body="None of your categories accept verification right now. Medicine, Law and similar categories will add accepted email domains over time."
        />
      )}
    </Screen>
  );
}
