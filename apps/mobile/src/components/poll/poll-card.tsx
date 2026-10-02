import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { FeedPoll } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

import { CountdownPill } from './countdown';
import { OptionTile } from './option-tile';

export function TypeBadge({ type, isTaste }: { type: FeedPoll['type']; isTaste?: boolean }) {
  return (
    <Text variant="caption" tone="muted">
      {isTaste ? 'Taste' : type === 'expert' ? 'Expert' : 'Community'}
    </Text>
  );
}

export function PollCard({ poll }: { poll: FeedPoll }) {
  const c = useColors();
  return (
    // iOS 18+: the card zooms into the vote screen (Expo Router zoom transition, alpha); elsewhere a normal push.
    <Link href={{ pathname: '/vote/[id]', params: { id: poll.id } }} asChild>
      <Link.AppleZoom>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the poll to vote"
          style={({ pressed }) => ({
            backgroundColor: c.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.border,
            padding: space[4],
            gap: space[3],
            opacity: pressed ? 0.9 : 1,
          })}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: space[2],
            }}>
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
              <TypeBadge type={poll.type} isTaste={poll.is_taste} />
              {poll.target_label ? ` · ${poll.target_label}` : ''}
            </Text>
            <CountdownPill closesAt={poll.closes_at} />
          </View>
          <Text variant="question">{poll.question}</Text>
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            {poll.options.map((o) => (
              <OptionTile key={o.side} option={o} compact />
            ))}
          </View>
        </Pressable>
      </Link.AppleZoom>
    </Link>
  );
}
