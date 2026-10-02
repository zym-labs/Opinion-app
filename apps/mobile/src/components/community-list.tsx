import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { track } from '@/lib/analytics';
import { ApiError, callFunction, errorMessage, rpc } from '@/lib/api';
import { keys, useCommunities, useMe } from '@/lib/queries';
import type { Community } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

/** A-08a: campus email → 6-digit code. */
function CampusVerify({ community, onDone }: { community: Community; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
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
    <View style={{ gap: space[3] }}>
      {!sent ? (
        <>
          <TextField
            label="Campus email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text variant="caption" tone="faint">
            We store only a scrambled version of this address, to check it’s used by one account.
          </Text>
          <Button
            label="Send code"
            loading={busy}
            onPress={() =>
              run(async () => {
                await callFunction('campus', { action: 'send', community_id: community.id, email });
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
            label="Verify"
            loading={busy}
            onPress={() =>
              run(async () => {
                await callFunction('campus', { action: 'verify', community_id: community.id, code });
                track('campus_verified', {});
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

function LaunchProgress({ members, launch_target }: { members: number; launch_target: number }) {
  const c = useColors();
  const pct = Math.min(100, Math.round((100 * members) / launch_target));
  return (
    <View style={{ gap: space[1] }} accessible accessibilityLabel={`${members} of ${launch_target} students joined. Opens at ${launch_target}.`}>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceMuted, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: c.optionA }} />
      </View>
      <Text variant="caption" tone="faint">
        {members} / {launch_target} joined · polls open at {launch_target}. Invite classmates from your profile.
      </Text>
    </View>
  );
}

export function CommunityList() {
  const c = useColors();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: communities } = useCommunities();
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const joined = new Set(me?.community_ids ?? []);
  // Campus communities in their launch phase: members so far vs. the number needed to open.
  const progress = useQuery({
    queryKey: ['community-progress'],
    queryFn: () => rpc<{ community_id: string; members: number; launch_target: number }[]>('community_progress'),
  });
  const launch = new Map((progress.data ?? []).map((p) => [p.community_id, p]));

  async function toggle(community: Community) {
    setError(null);
    try {
      if (joined.has(community.id)) await rpc('leave_community', { p_community: community.id });
      else {
        await rpc('join_community', { p_community: community.id });
        track('community_joined', { kind: community.kind });
      }
      await qc.invalidateQueries({ queryKey: keys.me });
      progress.refetch();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CAMPUS_VERIFICATION_REQUIRED') setVerifying(community.id);
      else setError(errorMessage(e));
    }
  }

  return (
    <View style={{ gap: space[3] }}>
      {error ? <Banner tone="danger" message={error} /> : null}
      {communities?.map((community) => (
        <View
          key={community.id}
          style={{
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: radius.lg,
            padding: space[4],
            gap: space[3],
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <View style={{ flex: 1, gap: space[1] }}>
              <Text variant="bodyStrong">{community.name}</Text>
              <Text variant="label" tone="muted">
                {community.kind === 'campus' ? 'Campus · email verification' : community.description}
              </Text>
            </View>
            <Button
              label={joined.has(community.id) ? 'Leave' : 'Join'}
              variant={joined.has(community.id) ? 'secondary' : 'primary'}
              onPress={() => toggle(community)}
            />
          </View>
          {launch.get(community.id) && launch.get(community.id)!.members < launch.get(community.id)!.launch_target ? (
            <LaunchProgress {...launch.get(community.id)!} />
          ) : null}
          {verifying === community.id ? (
            <CampusVerify
              community={community}
              onDone={async () => {
                setVerifying(null);
                await qc.invalidateQueries({ queryKey: keys.me });
              }}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}
