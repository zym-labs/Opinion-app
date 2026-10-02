import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useCredits, useUnreadCount } from '@/lib/queries';
import { radius, space, useColors } from '@/theme';

/** Title + credits pill + notifications bell (STAGE1 §1 header). */
export function HeaderBar({ title }: { title: string }) {
  const c = useColors();
  const { data: credits } = useCredits();
  const { data: unread = 0 } = useUnreadCount();
  const units = credits?.units ?? 0;
  const progress = units % 3;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
      <Text variant="title" style={{ flex: 1 }}>
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${credits?.polls_available ?? 0} polls available. ${progress} of 3 votes towards the next.`}
        onPress={() => router.push('/credits')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[1],
          paddingHorizontal: space[3],
          minHeight: 36,
          borderRadius: radius.full,
          backgroundColor: c.surfaceMuted,
        }}>
        <Text variant="label">{credits?.polls_available ?? 0}</Text>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i < progress ? c.text : c.border,
            }}
          />
        ))}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        onPress={() => router.push('/notifications')}
        hitSlop={8}
        style={{ minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' }}>
        <Bell size={24} strokeWidth={1.75} color={c.text} />
        {unread ? (
          <View
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              paddingHorizontal: 4,
              borderRadius: 8,
              backgroundColor: c.danger,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text variant="caption" style={{ color: c.bg, fontSize: 10, lineHeight: 12 }}>
              {unread > 9 ? '9+' : unread}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
