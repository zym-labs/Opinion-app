// Ask friends to vote on a live poll by link. Friends outside the audience can vote; the creator sees
// how many link votes came in (from 3 up), never who.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Share } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { errorMessage, rpc } from '@/lib/api';
import { pollLink } from '@/lib/links';
import { keys, useCredits } from '@/lib/queries';

type Stats = { invite_code: string | null; friends_only: boolean; link_votes: number };

/** Spend one poll credit to notify up to 50 more people in the audience who haven't voted. Once per poll. */
function Boost({ pollId }: { pollId: string }) {
  const qc = useQueryClient();
  const { data: credits } = useCredits();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);
  async function boost() {
    setBusy(true);
    try {
      const n = await rpc<number>('boost_poll', { p_poll: pollId });
      track('poll_boosted', { notified: n });
      setMsg({ tone: 'info', text: n ? `Boosted: ${n} more people were asked for their view.` : 'Boosted. Everyone eligible has already been asked today.' });
      qc.invalidateQueries({ queryKey: keys.credits });
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }
  if (msg) return <Banner tone={msg.tone} message={msg.text} />;
  return (
    <>
      <Button label="Boost: ask 50 more people (1 poll credit)" variant="ghost" loading={busy} disabled={(credits?.polls_available ?? 0) < 1} onPress={boost} />
    </>
  );
}

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
      {stats.data && !stats.data.friends_only ? <Boost pollId={pollId} /> : null}
    </>
  );
}
