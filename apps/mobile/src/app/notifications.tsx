// N-01 Notification center.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Pressable } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { rpc } from '@/lib/api';
import { LEGAL_URLS } from '@/lib/legal';
import { keys } from '@/lib/queries';
import type { Notification } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

// Matches the rule list in the admin dashboard and COMMUNITY_GUIDELINES.md.
const RULES: Record<string, string> = {
  harassment: 'Don’t target or identify private people',
  personal_info: 'Don’t share personal information',
  hate: 'No hate',
  sexual: 'No sexual content',
  self_harm: 'Don’t encourage self-harm or dangerous acts',
  spam: 'No spam, ads or vote coordination',
  ai_manipulation: 'Don’t try to trick the AI summary',
  misleading_expertise: 'Don’t claim expertise to mislead',
  illegal: 'No illegal content',
};

function describe(n: Notification) {
  const q = n.payload.question ? `“${n.payload.question}”` : '';
  switch (n.type) {
    case 'new_polls_digest':
      return { title: `${n.payload.count} new polls for you`, go: () => router.navigate('/') };
    case 'poll_ended':
      return { title: `Results are in: ${q}`, go: () => router.push({ pathname: '/result/[id]', params: { id: n.poll_id! } }) };
    case 'summary_ready':
      return { title: `Your poll is complete: ${q}`, go: () => router.push({ pathname: '/my-poll/[id]', params: { id: n.poll_id! } }) };
    case 'insight_featured':
      return { title: `Your reason was featured on ${q}`, go: () => router.push('/featured') };
    default: {
      // Statement of reasons for authors (DSA Art. 17); outcome note for reporters.
      if (n.payload.kind !== 'author') {
        return { title: 'A moderator reviewed something you reported. Thank you.', go: () => {} };
      }
      const rule = RULES[String(n.payload.rule)] ?? 'the community guidelines';
      const what = n.payload.target === 'poll' ? `Your poll ${q}` : 'Your reason';
      const title =
        n.payload.action === 'warn'
          ? `Warning: ${what.toLowerCase()} broke the rule “${rule}”. Repeated breaks can lead to suspension.`
          : `${what} was removed because it broke the rule “${rule}”. To appeal, contact support.`;
      return { title, go: () => WebBrowser.openBrowserAsync(LEGAL_URLS.support) };
    }
  }
}

export default function Notifications() {
  const c = useColors();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: keys.notifications, queryFn: () => rpc<Notification[]>('get_notifications') });

  useEffect(() => {
    rpc('mark_notifications_read').catch(() => {});
  }, []);

  if (!q.isLoading && !q.data?.length) {
    return (
      <Screen>
        <EmptyState title="No notifications" body="We’ll let you know when results are in." />
      </Screen>
    );
  }

  return (
    <Screen>
      {q.data?.map((n) => {
        const d = describe(n);
        return (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            onPress={() => {
              qc.invalidateQueries({ queryKey: keys.notifications });
              d.go();
            }}
            style={{
              backgroundColor: n.read_at ? c.surface : c.surfaceMuted,
              borderRadius: radius.lg,
              padding: space[4],
              gap: space[1],
            }}>
            <Text variant={n.read_at ? 'body' : 'bodyStrong'}>{d.title}</Text>
            <Text variant="caption" tone="faint">
              {new Date(n.created_at).toLocaleString()}
            </Text>
          </Pressable>
        );
      })}
    </Screen>
  );
}
