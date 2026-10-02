export type Side = 'a' | 'b' | 'c' | 'd';
export const SIDES: Side[] = ['a', 'b', 'c', 'd'];
export type PollType = 'expert' | 'community';
export type OnboardingStep =
  | 'signed_in'
  | 'age_verified'
  | 'terms_accepted'
  | 'categories_chosen'
  | 'communities_done'
  | 'complete';

export type Me = {
  onboarding_step: OnboardingStep;
  birth_year: number | null;
  status: 'active' | 'suspended' | 'deleted';
  category_ids: number[];
  community_ids: string[];
  categories_changed_at: string | null;
};

export type Category = { id: number; slug: string; name: string; is_sensitive: boolean; sort: number };
export type Community = { id: string; slug: string; name: string; description: string; kind: 'topic' | 'campus' };

export type PollOption = { side: Side; label: string | null; image_path: string | null };

export type FeedPoll = {
  id: string;
  type: PollType;
  is_taste: boolean;
  question: string;
  closes_at: string;
  target_label: string | null;
  is_sensitive: boolean;
  options: PollOption[];
  /** Feed sort bucket (0 = still needs votes); used as the paging cursor. */
  bucket?: number;
  /** Question of the poll this one follows up, if any. */
  follow_up_of?: string | null;
};

export type WaitingPoll = { id: string; question: string; closes_at: string; my_side: Side; options: PollOption[] };
export type ReadyResult = { id: string; question: string; closed_at: string };

export type MyPoll = {
  id: string;
  question: string;
  type: PollType;
  status: 'draft' | 'active' | 'closing' | 'summarizing' | 'completed' | 'failed_ai' | 'removed';
  vote_count: number;
  closes_at: string | null;
  created_at: string;
  removed_reason: string | null;
  parent_poll_id?: string | null;
  follow_up_count?: number;
  decision_side?: Side | null;
  decision_none?: boolean;
  decision_helpful?: boolean | null;
  decided_at?: string | null;
};

export type Result = {
  poll_id: string;
  question: string;
  state: 'ready' | 'not_enough_responses' | 'summary_pending' | 'summary_failed' | 'already_viewed';
  total_votes?: number;
  options?: (PollOption & { pct: number | null })[];
  winner?: Side | null;
  you?: { side?: Side; in_majority: boolean | null; predicted_correctly: boolean | null } | null;
  prediction?: { a_pct: number } | null;
  summary?: {
    majority: string | null;
    minority: string | null;
    points?: SummaryPoint[] | null;
    label: string;
    disclaimer: string | null;
  } | null;
  featured?: { id: string; quote: string; side: Side }[];
  reason_count?: number;
  /** How verified experts voted; null when fewer than 10 did. */
  verified?: { total: number; pcts: Partial<Record<Side, number>> } | null;
  view_once?: boolean;
};

export type Credits = { units: number; polls_available: number; pending_units: number };

export type Stats = {
  polls_voted: number;
  decided: number;
  decision_matches: number;
  week_votes: number;
  week_streak: number;
  majority_matches: number;
  contrarian_picks: number;
  predictions_right: number;
  predictions_made: number;
  majority_pct: number | null;
  featured_count: number;
  top_categories: string[];
  credits: number;
  polls_available: number;
};

export type Notification = {
  id: string;
  type: 'new_polls_digest' | 'poll_ended' | 'summary_ready' | 'insight_featured' | 'moderation_outcome'
    | 'follow_up'
    | 'decision_made'
    | 'decision_reminder'
    | 'last_call';
  poll_id: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

/** One AI summary point with its evidence (STAGE6 v2: citation links). */
export type SummaryPoint = { side: Side; text: string; reason_count: number; quote_ids: string[] };

/** Starter poll shown before sign-up: a completed poll's public result. */
export type StarterPoll = Result & { type: PollType; is_taste: boolean };
