// A-07 Choose up to 5 self-selected categories.
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { CategoryPicker } from '@/components/category-picker';
import { StepHeader } from '@/components/step-header';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { track } from '@/lib/analytics';
import { errorMessage, rpc } from '@/lib/api';
import { keys, useMe } from '@/lib/queries';

export default function Categories() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [ids, setIds] = useState<number[]>(me?.category_ids ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    try {
      await rpc('set_categories', { p_ids: ids });
      track('categories_saved', { count: ids.length });
      await qc.invalidateQueries({ queryKey: keys.me });
      router.replace('/communities');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <StepHeader
        step={3}
        total={4}
        title="What do you know about?"
        body="Pick up to 5. You’ll get expert polls in these topics. They’re self-selected — nobody checks credentials."
      />
      <CategoryPicker value={ids} onChange={setIds} />
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label="Continue" disabled={ids.length === 0} loading={busy} onPress={save} />
    </Screen>
  );
}
