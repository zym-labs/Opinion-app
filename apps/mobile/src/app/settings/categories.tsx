// S-02 Edit categories (7-day cooldown).
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { CategoryPicker } from '@/components/category-picker';
import { useNow } from '@/components/poll/countdown';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { errorMessage, rpc } from '@/lib/api';
import { keys, useMe } from '@/lib/queries';

export default function EditCategories() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [ids, setIds] = useState<number[]>(me?.category_ids ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changedAt = me?.categories_changed_at ? new Date(me.categories_changed_at).getTime() : 0;
  const now = useNow(60_000);
  const daysLeft = Math.ceil((changedAt + 7 * 86_400_000 - now) / 86_400_000);

  async function save() {
    setBusy(true);
    try {
      await rpc('set_categories', { p_ids: ids });
      await qc.invalidateQueries({ queryKey: keys.me });
      qc.invalidateQueries({ queryKey: keys.feed });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      {daysLeft > 0 ? <Banner message={`You can change categories again in ${daysLeft} days.`} /> : null}
      <CategoryPicker value={ids} onChange={setIds} />
      {error ? <Banner tone="danger" message={error} /> : null}
      <Button label="Save" disabled={ids.length === 0 || daysLeft > 0} loading={busy} onPress={save} />
    </Screen>
  );
}
