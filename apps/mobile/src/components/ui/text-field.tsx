import { TextInput, View, type TextInputProps } from 'react-native';

import { radius, space, type, useColors } from '@/theme';

import { Text } from './text';

export function TextField({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: space[2] }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textFaint}
        style={[
          type.body,
          {
            color: c.text,
            backgroundColor: c.surfaceMuted,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: error ? c.danger : c.border,
            paddingHorizontal: space[3],
            minHeight: 48,
          },
        ]}
        {...props}
      />
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
