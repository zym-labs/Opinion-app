// Home Screen / Lock Screen widget: today's question. Tapping opens the app on the feed.
// Widget code runs in the widget extension: only @expo/ui SwiftUI views, no hooks, no module constants.
import { Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type DailyQuestionProps = { question: string; options: string; answered: boolean };

const DailyQuestion = (props: DailyQuestionProps, environment: WidgetEnvironment) => {
  'widget';
  const small = environment.widgetFamily === 'systemSmall';
  if (environment.widgetFamily === 'accessoryRectangular' || environment.widgetFamily === 'accessoryInline') {
    return (
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 12, weight: 'semibold' })]}>Today’s question</Text>
        <Text modifiers={[font({ size: 13 }), lineLimit(2)]}>{props.question || 'Open Opinion'}</Text>
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 4 })]}>
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('secondary')]}>
        {props.answered ? 'You answered today’s question' : 'Today’s question'}
      </Text>
      <Text modifiers={[font({ size: small ? 15 : 17, weight: 'bold' }), lineLimit(small ? 4 : 3)]}>
        {props.question || 'A new question arrives every day.'}
      </Text>
      {small ? null : <Text modifiers={[font({ size: 13 }), foregroundStyle('secondary'), lineLimit(1)]}>{props.options}</Text>}
    </VStack>
  );
};

export default createWidget('DailyQuestion', DailyQuestion);
