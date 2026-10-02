import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, useColors } from '@/theme';

/** Scrollable screen. Pass onRefresh to enable pull-to-refresh. */
export function Screen({ children, style, onRefresh }: { children: ReactNode; style?: ViewStyle; onRefresh?: () => Promise<unknown> }) {
  const c = useColors();
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} /> : undefined}
        contentContainerStyle={[{ padding: space[4], gap: space[4], flexGrow: 1 }, style]}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
