// k6 load test (STAGE7 Phase 7): 2,000 votes/minute through the real votes Edge Function.
// STAGING ONLY. It creates test users with the service key and votes on polls from loadtest/seed.sql.
//
//   k6 run -e SUPABASE_URL=https://<ref>.supabase.co -e ANON_KEY=... -e SERVICE_KEY=... loadtest/votes.js
//
// Users are created as loadtest+N@example.com; delete them afterwards with loadtest/cleanup.sql.
import http from 'k6/http';
import { check, fail } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const URL = __ENV.SUPABASE_URL;
const ANON = __ENV.ANON_KEY;
const SERVICE = __ENV.SERVICE_KEY;
const USERS = Number(__ENV.USERS || 200);

export const options = {
  scenarios: {
    votes: {
      executor: 'constant-arrival-rate',
      rate: 2000,
      timeUnit: '1m',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 300,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    vote_latency: ['p(95)<800'],
    feed_latency: ['p(95)<400'],
  },
  setupTimeout: '10m',
};

const voteLatency = new Trend('vote_latency', true);
const feedLatency = new Trend('feed_latency', true);
const votesCast = new Counter('votes_cast');

const json = (extra = {}) => ({ headers: { 'Content-Type': 'application/json', apikey: ANON, ...extra } });
const rpc = (token, fn, body = {}) =>
  http.post(`${URL}/rest/v1/rpc/${fn}`, JSON.stringify(body), json({ Authorization: `Bearer ${token}` }));

// Creates and onboards a user, returning an access token (email OTP via the admin API, no inbox needed).
function makeUser(i) {
  const email = `loadtest+${i}@example.com`;
  const admin = { headers: { 'Content-Type': 'application/json', apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } };
  http.post(`${URL}/auth/v1/admin/users`, JSON.stringify({ email, email_confirm: true }), admin);
  const link = http.post(`${URL}/auth/v1/admin/generate_link`, JSON.stringify({ type: 'magiclink', email }), admin);
  const otp = link.json('email_otp');
  const session = http.post(`${URL}/auth/v1/verify`, JSON.stringify({ type: 'email', email, token: otp }), json());
  const token = session.json('access_token');
  if (!token) fail(`could not sign in ${email}: ${session.body}`);
  rpc(token, 'set_birth_year', { p_birth_year: 1998 });
  rpc(token, 'accept_terms', { p_version: 'loadtest' });
  const cats = http.get(`${URL}/rest/v1/categories?slug=eq.tech&select=id`, json({ Authorization: `Bearer ${token}` }));
  rpc(token, 'set_categories', { p_ids: [cats.json('0.id')] });
  rpc(token, 'complete_onboarding');
  return token;
}

export function setup() {
  if (!URL || !ANON || !SERVICE) fail('set SUPABASE_URL, ANON_KEY and SERVICE_KEY');
  const tokens = [];
  for (let i = 0; i < USERS; i++) tokens.push(makeUser(i));
  return { tokens };
}

export default function (data) {
  const token = data.tokens[Math.floor(Math.random() * data.tokens.length)];
  const feed = rpc(token, 'get_feed', { p_limit: 20 });
  feedLatency.add(feed.timings.duration);
  if (!check(feed, { 'feed 200': (r) => r.status === 200 })) return;
  const polls = feed.json();
  if (!polls.length) return; // this user has voted on everything; seed more polls or users
  const poll = polls[Math.floor(Math.random() * polls.length)];
  const res = http.post(
    `${URL}/functions/v1/votes`,
    JSON.stringify({
      poll_id: poll.id,
      side: Math.random() < 0.6 ? 'a' : 'b',
      reason: 'Load test reason that is long enough to pass validation',
      feature_consent: true,
    }),
    json({ Authorization: `Bearer ${token}` }),
  );
  voteLatency.add(res.timings.duration);
  // ALREADY_VOTED / RATE_LIMITED are expected under random selection; only 5xx is a failure.
  check(res, { 'vote not 5xx': (r) => r.status < 500 });
  if (res.status === 200) votesCast.add(1);
}
