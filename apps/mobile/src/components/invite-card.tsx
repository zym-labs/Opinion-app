// Invite friends (profile). Each friend who joins with your link and casts 3 votes earns you both a poll.
import { useQuery } from '@tanstack/react-query';
import { Share, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { rpc } from '@/lib/api';
import { inviteLink } from '@/lib/links';
import { radius, space, useColors } from '@/theme';

type Referral = { code: string; joined: number; credited: number };

export function InviteCard() {
  const c = useColors();
  const q = useQuery({
    queryKey: ['referral'],
    queryFn: async () => (await rpc<Referral[]>('my_referral'))[0],
  });
  const r = q.data;
  return (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: space[4], gap: space[2] }}>
      <Text variant="bodyStrong">Invite friends, both get a free poll</Text>
      <Text tone="muted">
        When a friend joins with your link and votes on 3 polls, you each get one poll to post.
        {r?.joined ? ` ${r.joined} joined · ${r.credited} earned.` : ''}
      </Text>
      <Button
        label="Share invite link"
        variant="secondary"
        disabled={!r}
        onPress={() => {
          if (!r) return;
          track('invite_shared', {});
          const url = inviteLink(r.code);
          Share.share({ message: `Get honest, anonymous opinions on your decisions. Join me on Opinion: ${url}`, url }).catch(() => {});
        }}
      />
    </View>
  );
}
