// "What are you deciding about these days?" One tap each; it reorders templates in Create and is
// editable later. Separate from expert topics: this is about the person's own life, not what they know.
import { View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { space } from '@/theme';

export const AREAS = [
  ['study', 'Study'],
  ['career', 'Career'],
  ['relationships', 'Relationships'],
  ['money', 'Money'],
  ['style', 'Style'],
  ['everyday', 'Everyday'],
  ['health', 'Health'],
  ['home', 'Home'],
] as const;

export type Area = (typeof AREAS)[number][0];

export function DecisionAreas({ value, onChange }: { value: Area[]; onChange: (v: Area[]) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
      {AREAS.map(([key, label]) => (
        <Chip
          key={key}
          label={label}
          selected={value.includes(key)}
          onPress={() => onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key])}
        />
      ))}
    </View>
  );
}
