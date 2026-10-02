import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { imageUrl } from '@/lib/api';
import type { PollOption } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

export function useSideColors(side: 'a' | 'b') {
  const c = useColors();
  return side === 'a'
    ? { strong: c.optionA, soft: c.optionASoft, text: c.optionA }
    : { strong: c.optionB, soft: c.optionBSoft, text: c.optionBText };
}

export function useImage(path: string | null) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    if (path) imageUrl(path).then(setUri);
  }, [path]);
  return uri;
}

export function SideBadge({ side }: { side: 'a' | 'b' }) {
  const s = useSideColors(side);
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: radius.full,
        backgroundColor: s.strong,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
        {side.toUpperCase()}
      </Text>
    </View>
  );
}

export function OptionTile({ option, selected, onPress, compact }: {
  option: PollOption;
  selected?: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  const c = useColors();
  const s = useSideColors(option.side);
  const uri = useImage(option.image_path);
  const label = option.label ?? 'Image option';

  return (
    <Pressable
      accessibilityRole={onPress ? 'radio' : undefined}
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`Option ${option.side.toUpperCase()}, ${label}`}
      disabled={!onPress}
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      style={{
        flex: 1,
        borderRadius: compact ? radius.md : radius.xl,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? s.strong : c.border,
        backgroundColor: selected ? s.soft : c.surface,
        padding: compact ? space[2] : space[3],
        gap: space[2],
        transform: [{ scale: selected ? 1.02 : 1 }],
      }}>
      <SideBadge side={option.side} />
      {option.image_path && !compact ? (
        <Image
          source={uri ? { uri } : undefined}
          style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: radius.lg, backgroundColor: c.surfaceMuted }}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <Text variant={compact ? 'label' : 'bodyStrong'} numberOfLines={compact ? 2 : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}
