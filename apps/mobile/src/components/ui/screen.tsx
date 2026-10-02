import type { ReactNode } from 'react';
import { ScrollView, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, useColors } from '@/theme';

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[{ padding: space[4], gap: space[4], flexGrow: 1 }, style]}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
