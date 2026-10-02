-- Polls with up to 4 options (roadmap). New enum values must be committed before use,
-- so they get their own migration.
alter type public.vote_side add value if not exists 'c';
alter type public.vote_side add value if not exists 'd';
