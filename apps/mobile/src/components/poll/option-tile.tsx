import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { imageUrl } from '@/lib/api';
import type { PollOption, Side } from '@/lib/types';
import { radius, space, useColors, type Colors } from '@/theme';

export function sideColors(c: Colors, side: Side) {
  return {
    a: { strong: c.optionA, soft: c.optionASoft, text: c.optionA },
    b: { strong: c.optionB, soft: c.optionBSoft, text: c.optionBText },
    c: { strong: c.optionC, soft: c.optionCSoft, text: c.optionC },
    d: { strong: c.optionD, soft: c.optionDSoft, text: c.optionD },
  }[side];
}

export function useSideColors(side: Side) {
  return sideColors(useColors(), side);
}

export function useImage(path: string | null) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    if (path) imageUrl(path).then(setUri);
  }, [path]);
  return uri;
}

export function SideBadge({ side }: { side: Side }) {
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
        flexBasis: '45%', // two per row; 3–4 options wrap into a grid
        flexGrow: 1,
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
          accessible={false} // the tile itself is labelled
        />
      ) : null}
      <Text variant={compact ? 'label' : 'bodyStrong'} numberOfLines={compact ? 2 : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}
