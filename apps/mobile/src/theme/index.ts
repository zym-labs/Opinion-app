import { palette, radius, space, type } from '@opinion/shared';
import { useColorScheme } from 'react-native';

export { radius, space, type };

export function useColors() {
  const scheme = useColorScheme();
  return palette[scheme === 'dark' ? 'dark' : 'light'];
}

export type Colors = ReturnType<typeof useColors>;
