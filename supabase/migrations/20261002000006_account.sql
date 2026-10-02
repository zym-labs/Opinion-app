-- Account deletion (STAGE2 §7). Called by the account Edge Function before it deletes the auth user,
-- which cascades to the profile; votes keep counting with voter_id set to null.
create or replace function public.prepare_account_deletion(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.polls set status = 'removed', removed_reason = 'creator_deleted'
  where creator_id = p_user and status in ('draft','active','closing','summarizing');
  update public.profiles set status = 'deleted', deleted_at = now() where id = p_user;
end $$;

revoke execute on function public.prepare_account_deletion from public, anon, authenticated;

-- Removed polls never produce results; drop any pending AI work.
create or replace function public.on_poll_removed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'removed' and old.status <> 'removed' then
    delete from public.ai_jobs where poll_id = new.id and status in ('queued','running');
  end if;
  return new;
end $$;
create trigger poll_removed after update of status on public.polls
  for each row execute function public.on_poll_removed();
