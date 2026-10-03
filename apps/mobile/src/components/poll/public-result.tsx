// Optional public page for a finished result (10+ votes): the split, AI summary and the quotes voters
// agreed to share, at a link anyone can open, so friends without the app (and search engines) can see it.
// Off by default; the asker can switch it off again at any time.
import { useState } from 'react';
import { Share, Switch, View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics';
import { errorMessage, rpc } from '@/lib/api';
import { resultLink } from '@/lib/links';
import { space } from '@/theme';

export function PublicResult({ pollId, onLink }: { pollId: string; onLink: (link: string | null) => void }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(on: boolean) {
    setError(null);
    try {
      const code = await rpc<string | null>('set_result_public', { p_poll: pollId, p_public: on });
      const url = code ? resultLink(code) : null;
      setLink(url);
      onLink(url);
      if (on) track('result_made_public', {});
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <View style={{ gap: space[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <Text style={{ flex: 1 }}>Public result page</Text>
        <Switch accessibilityLabel="Public result page" value={!!link} onValueChange={toggle} />
      </View>
      <Text variant="caption" tone="faint">
        Shows the split, the AI summary and quotes voters agreed to share. Never who voted. You can turn it off any time.
      </Text>
      {link ? <Button label="Share the page" variant="secondary" onPress={() => Share.share({ message: link, url: link })} /> : null}
      {error ? <Banner tone="danger" message={error} /> : null}
    </View>
  );
}
