-- Add a one-time-purchase entitlement tier to profiles.
-- free (default) | basic | pro. Replaces the is_subscriber boolean model.

alter table profiles add column if not exists tier text not null default 'free';

do $$
begin
  -- add the check constraint once
  if not exists (select 1 from pg_constraint where conname = 'profiles_tier_check') then
    alter table profiles
      add constraint profiles_tier_check check (tier in ('free', 'basic', 'pro'));
  end if;

  -- grandfather any existing subscribers into pro, if the legacy column exists
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'is_subscriber'
  ) then
    update profiles set tier = 'pro' where is_subscriber = true;
  end if;
end $$;
