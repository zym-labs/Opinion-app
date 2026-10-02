// Ask friends to vote on a live poll by link. Friends outside the audience can vote; the creator sees
// how many link votes came in (from 3 up), never who.
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Share } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { errorMessage, rpc } from '@/lib/api';
import { pollLink } from '@/lib/links';

type Stats = { invite_code: string | null; friends_only: boolean; link_votes: number };

export function FriendLink({ pollId, question }: { pollId: string; question: string }) {
  const stats = useQuery({
    queryKey: ['invite-stats', pollId],
    queryFn: async () => (await rpc<Stats[]>('poll_invite_stats', { p_poll: pollId }))[0] ?? null,
  });
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setError(null);
    try {
      const code = await rpc<string>('poll_invite_code', { p_poll: pollId });
      const url = pollLink(code);
      track('friend_link_shared', {});
      await Share.share({ message: `Help me decide: “${question}” — vote anonymously: ${url}`, url });
      stats.refetch();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <>
      {stats.data?.friends_only ? (
        <Banner message="Friends only: this poll isn’t in anyone’s feed. Share the link to get votes." />
      ) : null}
      <Button label="Ask friends to vote" variant="secondary" onPress={share} />
      {stats.data?.link_votes ? (
        <Text variant="caption" tone="faint">
          {stats.data.link_votes} votes came from your link.
        </Text>
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
    </>
  );
}
