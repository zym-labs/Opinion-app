import { LIMITS } from '@opinion/shared';
import { View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { useCategories } from '@/lib/queries';
import { space } from '@/theme';

export function CategoryPicker({ value, onChange, max = LIMITS.maxCategories }: {
  value: number[];
  onChange: (ids: number[]) => void;
  max?: number;
}) {
  const { data: categories } = useCategories();
  const toggle = (id: number) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : value.length < max ? [...value, id] : value);

  return (
    <View style={{ gap: space[3] }}>
      <Text variant="label" tone="muted">
        {value.length}/{max} selected
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {categories?.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.name}
            selected={value.includes(cat.id)}
            disabled={!value.includes(cat.id) && value.length >= max}
            onPress={() => toggle(cat.id)}
          />
        ))}
      </View>
    </View>
  );
}
