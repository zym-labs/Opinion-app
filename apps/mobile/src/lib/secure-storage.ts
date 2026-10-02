import * as SecureStore from 'expo-secure-store';

// Session tokens live in Keychain / Keystore (STAGE2 §2). SecureStore values are size-limited,
// so long values are split into chunks.
const CHUNK = 1800;

async function getItem(key: string): Promise<string | null> {
  const count = await SecureStore.getItemAsync(`${key}.n`);
  if (!count) return SecureStore.getItemAsync(key);
  const parts = await Promise.all(
    Array.from({ length: Number(count) }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
  );
  return parts.some((p) => p === null) ? null : parts.join('');
}

async function removeItem(key: string): Promise<void> {
  const count = await SecureStore.getItemAsync(`${key}.n`);
  if (count) {
    await Promise.all(
      Array.from({ length: Number(count) }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)),
    );
    await SecureStore.deleteItemAsync(`${key}.n`);
  }
  await SecureStore.deleteItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  await removeItem(key);
  const parts: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK) parts.push(value.slice(i, i + CHUNK));
  await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${key}.${i}`, p)));
  await SecureStore.setItemAsync(`${key}.n`, String(parts.length));
}

export const secureStorage = { getItem, setItem, removeItem };
