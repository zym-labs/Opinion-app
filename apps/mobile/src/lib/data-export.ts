// GDPR export: fetch the JSON from the server, save it to the cache and open the share sheet.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { callFunction } from './api';

export async function exportMyData() {
  const data = await callFunction<Record<string, unknown>>('data-export');
  const file = new File(Paths.cache, `opinion-data-${new Date().toISOString().slice(0, 10)}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Your Opinion data' });
}
