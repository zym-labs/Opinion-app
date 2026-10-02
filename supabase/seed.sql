-- Launch categories (STAGE2 §5) and communities. Sensitive categories get a "not professional advice" note.
insert into public.categories (slug, name, is_sensitive, sort) values
  ('tech', 'Tech', false, 1),
  ('career', 'Career', false, 2),
  ('money', 'Money', true, 3),
  ('health-fitness', 'Health & Fitness', false, 4),
  ('relationships', 'Relationships', false, 5),
  ('education', 'Education', false, 6),
  ('fashion', 'Fashion', false, 7),
  ('beauty', 'Beauty', false, 8),
  ('food', 'Food', false, 9),
  ('travel', 'Travel', false, 10),
  ('gaming', 'Gaming', false, 11),
  ('sports', 'Sports', false, 12),
  ('music', 'Music', false, 13),
  ('film-tv', 'Film & TV', false, 14),
  ('home', 'Home', false, 15),
  ('cars', 'Cars', false, 16),
  ('pets', 'Pets', false, 17),
  ('parenting', 'Parenting', false, 18),
  ('law', 'Law', true, 19),
  ('medicine', 'Medicine', true, 20)
on conflict (slug) do nothing;

insert into public.communities (slug, name, description, kind) values
  ('first-jobs', 'First jobs', 'Starting out at work: offers, interviews, first months.', 'topic'),
  ('student-budget', 'Student budget', 'Making money last through term.', 'topic'),
  ('flatmates', 'Flatmates', 'Sharing a home without falling out.', 'topic'),
  ('pilot-campus', 'Pilot Campus', 'Replace with the pilot campus name (Phase 0).', 'campus')
on conflict (slug) do nothing;

-- Replace with the pilot campus email domain(s).
insert into public.community_domains (community_id, domain)
select id, 'example.edu' from public.communities where slug = 'pilot-campus'
on conflict do nothing;

-- Example verifiable domain for Medicine (manage the real list in Admin → Experts).
insert into public.expert_domains (category_id, domain, label)
select id, 'nhs.net', 'NHS staff' from public.categories where slug = 'medicine'
on conflict do nothing;
