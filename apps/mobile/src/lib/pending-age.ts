import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIMITS } from '@opinion/shared';

// Birth year given before sign-up (try flow). Submitted automatically at the onboarding age step.
const KEY = 'opinion-pending-birth-year';

export const getPendingBirthYear = async () => {
  const v = await AsyncStorage.getItem(KEY).catch(() => null);
  return v ? Number(v) : null;
};

export const setPendingBirthYear = (year: number) => AsyncStorage.setItem(KEY, String(year)).catch(() => {});

export const clearPendingBirthYear = () => AsyncStorage.removeItem(KEY).catch(() => {});

export const isAdult = (year: number) => new Date().getFullYear() - year >= LIMITS.minAge;
