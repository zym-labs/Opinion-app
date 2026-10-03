// Keeps the iOS widget and Live Activity in sync with the app. All calls are best effort: on Android,
// web, Expo Go or older iOS they quietly do nothing.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import DailyQuestion from '@/widgets/daily-question';
import PollActivity, { type PollActivityProps } from '@/widgets/poll-activity';

const ios = Platform.OS === 'ios';
const ACTIVITY_POLL = 'live-activity-poll';

function safely(fn: () => unknown) {
  if (!ios) return;
  try {
    const r = fn();
    if (r instanceof Promise) r.catch(() => {});
  } catch {
    // Widgets need a development or store build with the widget extension.
  }
}

export function updateDailyWidget(daily: { question: string; options: { label: string | null }[]; voted: boolean } | null) {
  safely(() =>
    DailyQuestion.updateSnapshot({
      question: daily?.question ?? '',
      options: (daily?.options ?? []).map((o) => o.label ?? 'Image').join(' · '),
      answered: !!daily?.voted,
    }),
  );
}

export const liveActivitiesSupported = ios;

/** Shows (or refreshes) the Lock Screen activity for one of your live polls. */
export function showPollActivity(pollId: string, props: PollActivityProps) {
  safely(() => {
    const url = `opinion://my-poll/${pollId}`;
    AsyncStorage.setItem(ACTIVITY_POLL, pollId).catch(() => {});
    // One poll on the Lock Screen at a time: replace any earlier one.
    return Promise.all(PollActivity.getInstances().map((a) => a.end('immediate'))).then(() =>
      PollActivity.start(props, url, new Date(props.closesAt)),
    );
  });
}

/** Updates the vote count while the app is open, only if this poll is the one on the Lock Screen. */
export function updatePollActivity(pollId: string, props: PollActivityProps) {
  safely(async () => {
    if ((await AsyncStorage.getItem(ACTIVITY_POLL)) !== pollId) return;
    await Promise.all(PollActivity.getInstances().map((a) => (props.closed ? a.end('default', props) : a.update(props))));
  });
}

export function hasPollActivity() {
  if (!ios) return false;
  try {
    return PollActivity.getInstances().length > 0;
  } catch {
    return false;
  }
}
