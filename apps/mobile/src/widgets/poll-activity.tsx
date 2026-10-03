// Live Activity for your own live poll: votes so far and a countdown, on the Lock Screen and in the
// Dynamic Island. Never shows how people voted (results stay sealed until the poll closes).
import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, lineLimit, monospacedDigit, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type PollActivityProps = { question: string; votes: number; closesAt: number; closed: boolean };

const PollActivity = (props: PollActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const ends = new Date(props.closesAt);
  const countdown = props.closed ? (
    <Text modifiers={[font({ size: 14, weight: 'semibold' })]}>Closed</Text>
  ) : (
    <Text date={ends} dateStyle="timer" modifiers={[font({ size: 14, weight: 'semibold' }), monospacedDigit()]} />
  );
  return {
    banner: (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 14 })]}>
        <HStack>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('secondary')]}>Your poll on Opinion</Text>
          <Spacer />
          {countdown}
        </HStack>
        <Text modifiers={[font({ size: 16, weight: 'bold' }), lineLimit(2)]}>{props.question}</Text>
        <Text modifiers={[font({ size: 14 }), monospacedDigit()]}>
          {props.closed ? `${props.votes} votes · results are being prepared` : `${props.votes} votes so far`}
        </Text>
      </VStack>
    ),
    compactLeading: <Text modifiers={[font({ size: 12, weight: 'semibold' })]}>Votes</Text>,
    compactTrailing: <Text modifiers={[monospacedDigit()]}>{String(props.votes)}</Text>,
    minimal: <Text modifiers={[monospacedDigit()]}>{String(props.votes)}</Text>,
    expandedLeading: (
      <VStack alignment="leading">
        <Text modifiers={[font({ size: 24, weight: 'bold' }), monospacedDigit()]}>{String(props.votes)}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle('secondary')]}>votes</Text>
      </VStack>
    ),
    expandedTrailing: countdown,
    expandedBottom: (
      <Text modifiers={[font({ size: 14 }), lineLimit(environment.isActivityFullscreen ? 3 : 2)]}>{props.question}</Text>
    ),
  };
};

export default createLiveActivity('PollActivity', PollActivity);
