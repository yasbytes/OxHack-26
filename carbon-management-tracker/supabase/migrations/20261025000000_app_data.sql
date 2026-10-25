-- App data for Future Earth. Every table is locked to its owner with row level
-- security; friends only ever see each other's totals, through functions below.
begin;

-- --------------------------------------------------------------------------
-- Profile: one row per account
-- --------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  name text not null default '',
  -- How friends find each other: lowercase letters, numbers and _, unique
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  household int not null default 1 check (household between 1 and 20),
  diet text not null default 'meat' check (diet in ('meat', 'pescatarian', 'vegetarian', 'vegan')),
  -- Matches MIN/MAX_MONTHLY_LIMIT_KG in src/profileStore.ts
  monthly_limit_kg int not null default 365 check (monthly_limit_kg between 46 and 365),
  pet_name text not null default '' check (char_length(pet_name) <= 20),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Own profile" on public.profiles;
create policy "Own profile" on public.profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- --------------------------------------------------------------------------
-- Activity log
-- --------------------------------------------------------------------------
create table if not exists public.log_items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('travel', 'energy', 'food', 'quick')),
  -- The day the activity happened
  date date not null,
  -- When it was logged, in ms since 1970 like the front end's Date.now()
  logged_at bigint not null,
  title text not null check (char_length(title) <= 500),
  detail text not null default '' check (char_length(detail) <= 1000),
  -- Null when there's no estimate (free text nobody could read)
  kg double precision check (kg is null or (kg >= 0 and kg < 'Infinity'::double precision)),
  -- Bills cover a stretch of days ending on `date`
  spread_days int check (spread_days is null or spread_days between 1 and 366)
);

create index if not exists log_items_user_date on public.log_items (user_id, date);

alter table public.log_items enable row level security;

drop policy if exists "Own log" on public.log_items;
create policy "Own log" on public.log_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- --------------------------------------------------------------------------
-- Shop wallet: coins earned come from the log, so only spending is stored
-- --------------------------------------------------------------------------
create table if not exists public.shop_state (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  spent int not null default 0 check (spent >= 0),
  owned jsonb not null default '{}'::jsonb,
  -- When the last meal stops cheering the cat up, in ms since 1970
  fed_until bigint not null default 0,
  -- Food revives a collapsed cat once: when that meal wears off, 0 while unused
  revive_until bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.shop_state enable row level security;

drop policy if exists "Own wallet" on public.shop_state;
create policy "Own wallet" on public.shop_state
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- --------------------------------------------------------------------------
-- Friends: a request from one account to another, accepted by the other
-- --------------------------------------------------------------------------
create table if not exists public.friendships (
  requester uuid not null references auth.users on delete cascade,
  addressee uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

create index if not exists friendships_addressee on public.friendships (addressee);
create unique index if not exists friendships_pair on public.friendships
  (least(requester, addressee), greatest(requester, addressee));

alter table public.friendships enable row level security;

-- Reads only; every change goes through the functions below
drop policy if exists "See own friendships" on public.friendships;
create policy "See own friendships" on public.friendships
  for select to authenticated
  using ((select auth.uid()) in (requester, addressee));

-- A display name for anyone: their profile name, else their sign-up name,
-- else the start of their email
create or replace function public.display_name(person uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    nullif(trim(p.name), ''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    initcap(split_part(split_part(u.email, '@', 1), '.', 1))
  )
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where u.id = person
$$;
revoke execute on function public.display_name(uuid) from public, anon, authenticated;

-- kg on each day, with bills spread over the days they cover, the same way as
-- dailyShares in src/footprint.ts
create or replace function public.daily_kg(person uuid)
returns table (day date, kg double precision)
language sql stable security definer set search_path = ''
as $$
  select l.date - i, l.kg / coalesce(l.spread_days, 1)
  from public.log_items l
  cross join generate_series(0, coalesce(l.spread_days, 1) - 1) as i
  where l.user_id = person and l.kg is not null
$$;
revoke execute on function public.daily_kg(uuid) from public, anon, authenticated;

-- Everyone connected to the caller. Totals are only shared once a request is accepted.
create or replace function public.friends_overview()
returns table (
  user_id uuid,
  name text,
  username text,
  status text,
  week_kg double precision,
  year_kg double precision,
  monthly_limit_kg int
)
language sql stable security definer set search_path = ''
as $$
  with mine as (
    select
      case when f.requester = auth.uid() then f.addressee else f.requester end as other,
      case
        when f.status = 'accepted' then 'friend'
        when f.requester = auth.uid() then 'outgoing'
        else 'incoming'
      end as status
    from public.friendships f
    where auth.uid() in (f.requester, f.addressee)
  )
  select
    m.other,
    public.display_name(m.other),
    (select p.username from public.profiles p where p.user_id = m.other),
    m.status,
    case when m.status = 'friend' then coalesce(
      (select sum(d.kg) from public.daily_kg(m.other) d
       where d.day between current_date - 6 and current_date), 0) end,
    case when m.status = 'friend' then coalesce(
      (select sum(d.kg) from public.daily_kg(m.other) d
       where d.day between date_trunc('year', current_date)::date and current_date), 0) end,
    case when m.status = 'friend' then coalesce(
      (select p.monthly_limit_kg from public.profiles p where p.user_id = m.other), 365) end
  from mine m
  order by m.status, 2
$$;

-- Ask someone to be friends by their username (with or without the @) or
-- their account email. If they already asked you, this accepts their request instead.
create or replace function public.send_friend_request(friend text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  them uuid;
  wanted text := lower(trim(friend));
  existing public.friendships;
begin
  if me is null then raise exception 'not_signed_in'; end if;

  if wanted like '_%@%' then
    select id into them from auth.users where lower(email) = wanted;
  else
    select user_id into them from public.profiles where username = ltrim(wanted, '@');
  end if;
  if them is null then raise exception 'no_account'; end if;
  if them = me then raise exception 'is_you'; end if;

  -- Simultaneous requests in opposite directions must create just one friendship.
  perform pg_advisory_xact_lock(hashtextextended(
    least(me, them)::text || greatest(me, them)::text, 0));

  select * into existing from public.friendships
  where (requester = me and addressee = them) or (requester = them and addressee = me);

  if found then
    if existing.status = 'accepted' then raise exception 'already_friends'; end if;
    if existing.requester = me then raise exception 'already_sent'; end if;
    update public.friendships set status = 'accepted'
    where requester = them and addressee = me;
    return 'accepted';
  end if;

  insert into public.friendships (requester, addressee) values (me, them);
  return 'sent';
end
$$;

create or replace function public.respond_friend_request(friend_id uuid, accept boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if accept then
    update public.friendships set status = 'accepted'
    where requester = friend_id and addressee = auth.uid() and status = 'pending';
  else
    delete from public.friendships
    where requester = friend_id and addressee = auth.uid() and status = 'pending';
  end if;
end
$$;

-- Unfriend, or cancel a request either way
create or replace function public.remove_friend(friend_id uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.friendships
  where (requester = auth.uid() and addressee = friend_id)
     or (requester = friend_id and addressee = auth.uid())
$$;

revoke execute on function public.friends_overview() from public, anon;
revoke execute on function public.send_friend_request(text) from public, anon;
revoke execute on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke execute on function public.remove_friend(uuid) from public, anon;
grant execute on function public.friends_overview() to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;

-- Explicit grants also work on projects without Supabase's default table grants.
revoke all on public.profiles, public.log_items, public.shop_state, public.friendships from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.log_items, public.shop_state to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.friendships from authenticated;
grant select on public.friendships to authenticated;

-- Realtime tells the app when a request arrives; it only sends rows the
-- "See own friendships" policy lets each person read
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships') then
    alter publication supabase_realtime add table public.friendships;
  end if;
end
$$;
notify pgrst, 'reload schema';
commit;
