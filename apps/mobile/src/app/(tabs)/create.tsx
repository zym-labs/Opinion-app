// C-00…C-06 Create flow (STAGE1 §4) in one screen with steps.
import { LIMITS } from '@opinion/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CategoryPicker } from '@/components/category-picker';
import { CrisisSupport } from '@/components/crisis-support';
import { type Area } from '@/components/decision-areas';
import { HeaderBar } from '@/components/header-bar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { track } from '@/lib/analytics';
import { ApiError, callFunction, errorMessage, rpc } from '@/lib/api';
import { keys, useCategories, useCommunities, useCredits, useMe, usePlus } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { SIDES, type PollType, type Side } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

type Draft = {
  type: PollType;
  isTaste: boolean;
  question: string;
  /** Number of options in use, 2–4 (a, b, then c, d). */
  count: number;
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
  count: 2,
  labels: { a: '', b: '', c: '', d: '' },
  images: { a: null, b: null, c: null, d: null },
  categoryIds: [],
  ageRange: null,
  communityId: null,
  hours: 12,
};

// Starting points for common decisions. They fill in the question and options; everything stays editable.
const TEMPLATES: { id: string; label: string; question: string; options: string[]; taste?: boolean; area: Area }[] = [
  { id: 'offer', label: 'Which offer?', question: 'Which offer should I take?', options: ['Offer A', 'Offer B'], area: 'career' },
  { id: 'should', label: 'Should I…?', question: 'Should I ', options: ['Yes', 'No'], area: 'everyday' },
  { id: 'text', label: 'Text them or wait?', question: 'Should I text first or wait?', options: ['Text now', 'Wait'], area: 'relationships' },
  { id: 'save', label: 'Spend or save?', question: 'Should I spend on this or save?', options: ['Spend', 'Save'], area: 'money' },
  { id: 'buy', label: 'Which to buy?', question: 'Which should I buy for ', options: ['', ''], area: 'money' },
  { id: 'course', label: 'Which course?', question: 'Which course should I pick next term?', options: ['', ''], area: 'study' },
  { id: 'look', label: 'Which looks better?', question: 'Which looks better?', options: ['', ''], taste: true, area: 'style' },
  { id: 'now', label: 'Now or later?', question: 'Should I do this now or wait?', options: ['Now', 'Wait'], area: 'everyday' },
];

// One draft is kept on the device (STAGE1 §4) and restored when Create opens.
const DRAFT_KEY = 'opinion-poll-draft';

const AGE_PRESETS: [number, number][] = [
  [18, 24],
  [25, 34],
  [35, 44],
  [45, 64],
];
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
    <View style={{ flexBasis: '47%', flexGrow: 1, gap: space[2] }}>
      <TextField
        label={`Option ${side.toUpperCase()}`}
        value={draft.labels[side]}
        onChangeText={(t) =>
          setDraft({ ...draft, labels: { ...draft.labels, [side]: t.slice(0, LIMITS.optionLabelMax) } })
        }
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
  const { data: plus } = usePlus();
  const { data: categories } = useCategories();
  const { data: areas = [] } = useQuery({ queryKey: ['decision-areas'], queryFn: () => rpc<Area[]>('my_decision_areas') });
  // "Think it through": private 10/10/10 notes, kept in the decision journal.
  const [notes, setNotes] = useState({ ten_minutes: '', ten_months: '', ten_years: '' });
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const restored = useRef(false);
  const pending = useRef<{ id: string; fingerprint: string; uploaded: boolean } | null>(null);
  // Follow-up mode: same audience as the asker's completed poll (roadmap: follow-up polls).
  const { followUp } = useLocalSearchParams<{ followUp?: string }>();
  const [parent, setParent] = useState<{ id: string; question: string } | null>(null);
  useEffect(() => {
    if (!followUp) return;
    rpc<{
      question: string;
      type: PollType;
      is_taste: boolean;
      community_id: string | null;
      age_min: number | null;
      age_max: number | null;
      category_ids: number[];
    }>('get_follow_up_template', { p_parent: followUp })
      .then((t) => {
        setParent({ id: followUp, question: t.question });
        setDraft((d) => ({
          ...d,
          type: t.type,
          isTaste: t.is_taste,
          communityId: t.community_id,
          categoryIds: t.category_ids,
          ageRange: t.age_min != null && t.age_max != null ? [t.age_min, t.age_max] : null,
        }));
      })
      .catch(() => setParent(null));
  }, [followUp]);

  useEffect(() => {
    // A follow-up starts from the parent's audience, not from an older saved draft.
    if (followUp) {
      restored.current = true;
      return;
    }
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        setDraft({
          ...EMPTY,
          ...saved,
          labels: { ...EMPTY.labels, ...saved.labels },
          images: { ...EMPTY.images, ...saved.images },
        });
      })
      .catch(() => {})
      .finally(() => {
        restored.current = true;
      });
  }, [followUp]);

  useEffect(() => {
    if (!restored.current) return;
    const t = setTimeout(() => {
      const empty = JSON.stringify(draft) === JSON.stringify(EMPTY);
      (empty ? AsyncStorage.removeItem(DRAFT_KEY) : AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft))).catch(
        () => {},
      );
    }, 500);
    return () => clearTimeout(t);
  }, [draft]);

  const myCommunities = communities?.filter((x) => me?.community_ids.includes(x.id)) ?? [];
  const targeting = {
    p_type: draft.type,
    p_categories: draft.type === 'expert' ? draft.categoryIds : [],
    p_age_min: draft.type === 'expert' ? (draft.ageRange?.[0] ?? null) : null,
    p_age_max: draft.type === 'expert' ? (draft.ageRange?.[1] ?? null) : null,
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
          Vote on {3 - progress} more {3 - progress === 1 ? 'poll' : 'polls'} to post your own. Voting keeps Opinion
          fair: everyone who asks also helps others decide.
        </Text>
        {credits.pending_units > 0 ? (
          <Banner message="Credits from new accounts unlock 24 hours after sign-up." />
        ) : null}
        <Button label="Go to feed" onPress={() => router.navigate('/')} />
      </Screen>
    );
  }

  const questionOk = draft.question.trim().length >= 5;
  const active = SIDES.slice(0, draft.count);
  const optionsOk = active.every((s) => draft.labels[s].trim() || draft.images[s]);
  const audienceOk = (audience.data ?? 0) >= LIMITS.minAudience;
  const canPublish = questionOk && optionsOk && targetChosen && audienceOk;

  async function publish(friendsOnly = false) {
    setLocked(false);
    setBusy(true);
    setError(null);
    try {
      // Retrying an unchanged poll reuses its server draft (and uploaded images) instead of creating another.
      const fingerprint = JSON.stringify({ draft, parent: parent?.id ?? null });
      if (pending.current?.fingerprint !== fingerprint) pending.current = null;
      const poll_id =
        pending.current?.id ??
        (
          await callFunction<{ poll_id: string }>('polls', {
            action: 'create',
            type: draft.type,
            is_taste: draft.isTaste,
            question: draft.question.trim(),
            labels: active.map((s) => draft.labels[s].trim() || null),
            images: active.map((s) => !!draft.images[s]),
            category_ids: targeting.p_categories,
            age_min: targeting.p_age_min,
            age_max: targeting.p_age_max,
            community_id: targeting.p_community,
            parent_poll_id: parent?.id ?? null,
            duration_hours: draft.hours,
          })
        ).poll_id;
      pending.current ??= { id: poll_id, fingerprint, uploaded: false };
      for (const side of pending.current.uploaded ? [] : active) {
        const uri = draft.images[side];
        if (!uri) continue;
        const body = await (await fetch(uri)).arrayBuffer();
        const { error: upErr } = await supabase.storage
          .from('poll-images')
          .upload(`${poll_id}/${side}.jpg`, body, { contentType: 'image/jpeg', upsert: true });
        if (upErr) throw upErr;
      }
      pending.current.uploaded = true;
      await callFunction('polls', { action: 'publish', poll_id, friends_only: friendsOnly }, { signed: true });
      pending.current = null;
      if (Object.values(notes).some((n) => n.trim())) {
        rpc('save_reflection', { p_poll: poll_id, p_notes: notes }).catch(() => {});
        setNotes({ ten_minutes: '', ten_months: '', ten_years: '' });
      }
      track('poll_published', {
        type: draft.type,
        hours: draft.hours,
        with_images: active.some((s) => !!draft.images[s]),
        age_range: !!targeting.p_age_min,
        friends_only: friendsOnly,
      });
      setDraft(EMPTY);
      setParent(null);
      router.setParams({ followUp: undefined });
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      qc.invalidateQueries({ queryKey: keys.credits });
      qc.invalidateQueries({ queryKey: keys.myPolls(false) });
      router.push({ pathname: '/my-poll/[id]', params: { id: poll_id } });
    } catch (e) {
      track('publish_failed', { code: e instanceof ApiError ? e.code : 'UNKNOWN' });
      if (e instanceof ApiError && e.code === 'COMMUNITY_LOCKED') setLocked(true);
      if (e instanceof ApiError && e.code === 'CRISIS_SUPPORT') setCrisis(true);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <HeaderBar title="Create" />
      {parent ? (
        <Banner message={`Follow-up to “${parent.question}”. Same audience as before; change it below if you like.`} />
      ) : null}

      <Section title="Who should answer?">
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <Chip
            label="Experts"
            selected={draft.type === 'expert'}
            onPress={() => setDraft({ ...draft, type: 'expert' })}
          />
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

      {!draft.question.trim() ? (
        <Section title="Start from a template">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {[...TEMPLATES].sort((x, y) => Number(areas.includes(y.area)) - Number(areas.includes(x.area))).map((t) => (
              <Chip
                key={t.id}
                label={t.label}
                selected={false}
                onPress={() => {
                  track('template_used', { id: t.id });
                  setDraft({
                    ...draft,
                    question: t.question,
                    isTaste: t.taste ?? draft.isTaste,
                    count: t.options.length,
                    labels: { ...EMPTY.labels, ...Object.fromEntries(t.options.map((o, i) => [SIDES[i], o])) },
                  });
                }}
              />
            ))}
          </View>
        </Section>
      ) : null}
      <Section title="Your question">
        <TextField
          label={`Question (${draft.question.length}/${LIMITS.questionMax})`}
          value={draft.question}
          onChangeText={(t) => setDraft({ ...draft, question: t.slice(0, LIMITS.questionMax) })}
          multiline
          placeholder="MacBook Air or ThinkPad X1 for a CS degree?"
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
          {active.map((side) => (
            <OptionEditor key={side} side={side} draft={draft} setDraft={setDraft} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          {draft.count < 4 ? (
            <Button
              label="Add option"
              variant="secondary"
              onPress={() => setDraft({ ...draft, count: draft.count + 1 })}
            />
          ) : null}
          {draft.count > 2 ? (
            <Button
              label={`Remove option ${SIDES[draft.count - 1].toUpperCase()}`}
              variant="ghost"
              onPress={() => {
                const last = SIDES[draft.count - 1];
                setDraft({
                  ...draft,
                  count: draft.count - 1,
                  labels: { ...draft.labels, [last]: '' },
                  images: { ...draft.images, [last]: null },
                });
              }}
            />
          ) : null}
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

      <Section title="Think it through (optional, only you see this)">
        {thinking ? (
          <>
            {(
              [
                ['ten_minutes', 'How will I feel about each option in 10 minutes?'],
                ['ten_months', '…in 10 months?'],
                ['ten_years', '…in 10 years?'],
              ] as const
            ).map(([k, label]) => (
              <TextField
                key={k}
                label={label}
                value={notes[k]}
                onChangeText={(t) => setNotes({ ...notes, [k]: t.slice(0, 300) })}
                multiline
              />
            ))}
            <Text variant="caption" tone="faint">
              Saved to your decision journal so you can look back later.
            </Text>
          </>
        ) : (
          <Button label="Try the 10/10/10 check" variant="ghost" onPress={() => setThinking(true)} />
        )}
      </Section>

      {draft.type === 'expert'
        ? categories
            ?.filter((cat) => cat.safety_note && draft.categoryIds.includes(cat.id))
            .map((cat) => <Banner key={cat.id} message={cat.safety_note!} />)
        : null}

      <Section title="How long should it run?">
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          {(plus?.active ? [...HOUR_PRESETS, 48] : HOUR_PRESETS).map((h) => (
            <Chip
              key={h}
              label={`${h}h`}
              selected={draft.hours === h}
              onPress={() => setDraft({ ...draft, hours: h })}
            />
          ))}
        </View>
      </Section>

      {targetChosen && !audience.isLoading ? (
        audienceOk ? (
          <Banner message={`About ${audience.data} people match this audience.`} />
        ) : (
          <Banner
            tone="warning"
            message="Fewer than 20 people match. Add categories, remove the age range or choose a bigger community, or ask your friends instead."
          />
        )
      ) : null}
      {targetChosen && !audience.isLoading && (!audienceOk || locked) ? (
        <>
          <Button
            label="Publish to friends only"
            variant="secondary"
            disabled={!(questionOk && optionsOk)}
            loading={busy}
            onPress={() => publish(true)}
          />
          <Text variant="caption" tone="faint">
            Friends-only polls stay out of the feed. Your close friends get it straight away, and you get a link to
            share with anyone else. Results still need 10 votes.
          </Text>
        </>
      ) : null}
      {crisis ? <CrisisSupport /> : error ? <Banner tone="danger" message={error} /> : null}
      {JSON.stringify(draft) !== JSON.stringify(EMPTY) ? (
        <Button label="Discard draft" variant="ghost" onPress={() => setDraft(EMPTY)} />
      ) : null}
      <Button label="Publish — uses 1 poll credit" disabled={!canPublish} loading={busy} onPress={() => publish()} />
    </Screen>
  );
}
