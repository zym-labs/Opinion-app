import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { onlineManager, type Query } from '@tanstack/react-query';

// Offline: the feed and lists stay readable from the last sync; voting and posting need a connection.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

export const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'opinion-cache' });

// Results are view-once and never cached on the device.
const NEVER_PERSIST = new Set(['result', 'my-poll-result', 'audience']);
export const shouldPersist = (q: Query) =>
  q.state.status === 'success' && !NEVER_PERSIST.has(String(q.queryKey[0]));

export function useOffline() {
  const net = useNetInfo();
  return net.isConnected === false;
}
