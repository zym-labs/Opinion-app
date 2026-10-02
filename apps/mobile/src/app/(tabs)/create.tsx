// C-00…C-06 Create flow (STAGE1 §4) in one screen with steps.
import { LIMITS } from '@opinion/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CategoryPicker } from '@/components/category-picker';
import { HeaderBar } from '@/components/header-bar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { track } from '@/lib/analytics';
import { ApiError, callFunction, errorMessage, rpc } from '@/lib/api';
import { keys, useCommunities, useCredits, useMe } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { PollType, Side } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

type Draft = {
  type: PollType;
  isTaste: boolean;
  question: string;
  labels: Record<Side, string>;
  images: Record<Side, string | null>; // local uris
  categoryIds: number[];
  ageRange: [number, number] | null;
  communityId: string | null;
  hours: number;
};

const EMPTY: Draft = {
  type: 'expert',
  isTaste: false,
  question: '',
  labels: { a: '', b: '' },
  images: { a: null, b: null },
  categoryIds: [],
  ageRange: null,
  communityId: null,
  hours: 12,
};

// One draft is kept on the device (STAGE1 §4) and restored when Create opens.
const DRAFT_KEY = 'opinion-poll-draft';

const AGE_PRESETS: [number, number][] = [[18, 24], [25, 34], [35, 44], [45, 64]];
const HOUR_PRESETS = [3, 6, 12, 24];

/** Re-encodes the picked image: resizes to 1080px and strips EXIF (incl. GPS). */
async function prepareImage(uri: string) {
  const ctx = ImageManipulator.ImageManipulator.manipulate(uri).resize({ width: 1080 });
  const img = await ctx.renderAsync();
  const saved = await img.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 });
  return saved.uri;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space[3] }}>
      <Text variant="bodyStrong">{title}</Text>
      {children}
    </View>
  );
}

function OptionEditor({ side, draft, setDraft }: { side: Side; draft: Draft; setDraft: (d: Draft) => void }) {
  const c = useColors();
  async function pick() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, exif: false });
    if (res.canceled) return;
    const uri = await prepareImage(res.assets[0].uri);
    setDraft({ ...draft, images: { ...draft.images, [side]: uri } });
  }
  const image = draft.images[side];
  return (
    <View style={{ flex: 1, gap: space[2] }}>
      <TextField
        label={`Option ${side.toUpperCase()}`}
        value={draft.labels[side]}
        onChangeText={(t) => setDraft({ ...draft, labels: { ...draft.labels, [side]: t.slice(0, LIMITS.optionLabelMax) } })}
      />
      {image ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove image for option ${side.toUpperCase()}`}
          onPress={() => setDraft({ ...draft, images: { ...draft.images, [side]: null } })}>
          <Image
            source={{ uri: image }}
            accessible={false}
            style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: radius.lg }}
          />
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            Tap to remove
          </Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={pick}
          style={{
            minHeight: 48,
            borderRadius: radius.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text variant="label" tone="muted">
            Add image (optional)
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function Create() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: communities } = useCommunities();
  const { data: credits } = useCredits();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restored = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        if (raw) setDraft({ ...EMPTY, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => {
        restored.current = true;
      });
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    const t = setTimeout(() => {
      const empty = JSON.stringify(draft) === JSON.stringify(EMPTY);
      (empty ? AsyncStorage.removeItem(DRAFT_KEY) : AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft))).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [draft]);

  const myCommunities = communities?.filter((x) => me?.community_ids.includes(x.id)) ?? [];
  const targeting = {
    p_type: draft.type,
    p_categories: draft.type === 'expert' ? draft.categoryIds : [],
    p_age_min: draft.type === 'expert' ? draft.ageRange?.[0] ?? null : null,
    p_age_max: draft.type === 'expert' ? draft.ageRange?.[1] ?? null : null,
    p_community: draft.type === 'community' ? draft.communityId : null,
  };
  const targetChosen = draft.type === 'expert' ? draft.categoryIds.length > 0 : !!draft.communityId;
  const audience = useQuery({
    queryKey: ['audience', targeting],
    enabled: targetChosen,
    queryFn: () => rpc<number>('estimate_audience', targeting),
  });

  if (credits && credits.polls_available < 1) {
    // C-00 No credits.
    const progress = credits.units % 3;
    return (
      <Screen>
        <HeaderBar title="Create" />
        <Text variant="question">Vote to ask</Text>
        <Text tone="muted">
          Vote on {3 - progress} more {3 - progress === 1 ? 'poll' : 'polls'} to post your own. Voting keeps
          Opinion fair: everyone who asks also helps others decide.
        </Text>
        {credits.pending_units > 0 ? (
          <Banner message="Credits from new accounts unlock 24 hours after sign-up." />
        ) : null}
        <Button label="Go to feed" onPress={() => router.navigate('/')} />
      </Screen>
    );
  }

  const questionOk = draft.question.trim().length >= 5;
  const optionsOk = (['a', 'b'] as const).every((s) => draft.labels[s].trim() || draft.images[s]);
  const audienceOk = (audience.data ?? 0) >= LIMITS.minAudience;
  const canPublish = questionOk && optionsOk && targetChosen && audienceOk;

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const { poll_id } = await callFunction<{ poll_id: string }>('polls', {
        action: 'create',
        type: draft.type,
        is_taste: draft.isTaste,
        question: draft.question.trim(),
        label_a: draft.labels.a.trim() || null,
        label_b: draft.labels.b.trim() || null,
        image_a: !!draft.images.a,
        image_b: !!draft.images.b,
        category_ids: targeting.p_categories,
        age_min: targeting.p_age_min,
        age_max: targeting.p_age_max,
        community_id: targeting.p_community,
        duration_hours: draft.hours,
      });
      for (const side of ['a', 'b'] as const) {
        const uri = draft.images[side];
        if (!uri) continue;
        const body = await (await fetch(uri)).arrayBuffer();
        const { error: upErr } = await supabase.storage
          .from('poll-images')
          .upload(`${poll_id}/${side}.jpg`, body, { contentType: 'image/jpeg', upsert: true });
        if (upErr) throw upErr;
      }
      await callFunction('polls', { action: 'publish', poll_id }, { signed: true });
      track('poll_published', {
        type: draft.type,
        hours: draft.hours,
        with_images: !!(draft.images.a || draft.images.b),
        age_range: !!targeting.p_age_min,
      });
      setDraft(EMPTY);
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      qc.invalidateQueries({ queryKey: keys.credits });
      qc.invalidateQueries({ queryKey: keys.myPolls(false) });
      router.push({ pathname: '/my-poll/[id]', params: { id: poll_id } });
    } catch (e) {
      track('publish_failed', { code: e instanceof ApiError ? e.code : 'UNKNOWN' });
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <HeaderBar title="Create" />

      <Section title="Who should answer?">
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <Chip label="Experts" selected={draft.type === 'expert'} onPress={() => setDraft({ ...draft, type: 'expert' })} />
          <Chip
            label="A community"
            selected={draft.type === 'community'}
            onPress={() => setDraft({ ...draft, type: 'community' })}
          />
        </View>
        <Chip
          label="Taste question — reasons optional"
          selected={draft.isTaste}
          onPress={() => setDraft({ ...draft, isTaste: !draft.isTaste })}
        />
      </Section>

      <Section title="Your question">
        <TextField
          label={`Question (${draft.question.length}/${LIMITS.questionMax})`}
          value={draft.question}
          onChangeText={(t) => setDraft({ ...draft, question: t.slice(0, LIMITS.questionMax) })}
          multiline
          placeholder="MacBook Air or ThinkPad X1 for a CS degree?"
        />
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <OptionEditor side="a" draft={draft} setDraft={setDraft} />
          <OptionEditor side="b" draft={draft} setDraft={setDraft} />
        </View>
      </Section>

      {draft.type === 'expert' ? (
        <Section title="Categories (1–5)">
          <CategoryPicker value={draft.categoryIds} onChange={(ids) => setDraft({ ...draft, categoryIds: ids })} />
          <Text variant="label" tone="muted">
            Age range (optional)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            <Chip label="Any age" selected={!draft.ageRange} onPress={() => setDraft({ ...draft, ageRange: null })} />
            {AGE_PRESETS.map((r) => (
              <Chip
                key={r[0]}
                label={`${r[0]}–${r[1]}`}
                selected={draft.ageRange?.[0] === r[0]}
                onPress={() => setDraft({ ...draft, ageRange: r })}
              />
            ))}
          </View>
        </Section>
      ) : (
        <Section title="Community">
          {myCommunities.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              {myCommunities.map((x) => (
                <Chip
                  key={x.id}
                  label={x.name}
                  selected={draft.communityId === x.id}
                  onPress={() => setDraft({ ...draft, communityId: x.id })}
                />
              ))}
            </View>
          ) : (
            <Banner message="Join a community first (Profile → Settings → Communities)." />
          )}
        </Section>
      )}

      <Section title="How long should it run?">
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          {HOUR_PRESETS.map((h) => (
            <Chip key={h} label={`${h}h`} selected={draft.hours === h} onPress={() => setDraft({ ...draft, hours: h })} />
          ))}
        </View>
      </Section>

      {targetChosen ? (
        audienceOk ? (
          <Banner message={`About ${audience.data} people match this audience.`} />
        ) : audience.isLoading ? null : (
          <Banner
            tone="warning"
            message="Fewer than 20 people match. Add categories, remove the age range or choose a bigger community."
          />
        )
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      {JSON.stringify(draft) !== JSON.stringify(EMPTY) ? (
        <Button label="Discard draft" variant="ghost" onPress={() => setDraft(EMPTY)} />
      ) : null}
      <Button label="Publish — uses 1 poll credit" disabled={!canPublish} loading={busy} onPress={publish} />
    </Screen>
  );
}
