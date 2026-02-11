-- ============================================================
-- INNER CIRCLE — Supabase Schema
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  initial char(1) generated always as (upper(left(name, 1))) stored,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by circle members"
  on public.profiles for select
  using (
    id in (
      select cm2.user_id from circle_members cm1
      join circle_members cm2 on cm1.circle_id = cm2.circle_id
      where cm1.user_id = auth.uid()
    )
    or id = auth.uid()
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Anonymous'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. CIRCLES (friend groups)
-- ============================================================
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique default encode(gen_random_bytes(4), 'hex'),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.circles enable row level security;

create policy "Circles viewable by members"
  on public.circles for select
  using (
    id in (select circle_id from circle_members where user_id = auth.uid())
  );

create policy "Authenticated users can create circles"
  on public.circles for insert
  with check (auth.uid() = created_by);


-- 3. CIRCLE MEMBERS
-- ============================================================
create table public.circle_members (
  circle_id uuid references public.circles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now(),
  primary key (circle_id, user_id)
);

alter table public.circle_members enable row level security;

create policy "Members can view their circle's members"
  on public.circle_members for select
  using (
    circle_id in (select circle_id from circle_members where user_id = auth.uid())
  );

create policy "Members can join via invite"
  on public.circle_members for insert
  with check (user_id = auth.uid());

-- Auto-add creator as admin
create or replace function public.auto_add_circle_creator()
returns trigger as $$
begin
  insert into public.circle_members (circle_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_circle_created
  after insert on public.circles
  for each row execute function public.auto_add_circle_creator();


-- 4. PRESENCE (awake/sleep status)
-- ============================================================
create table public.presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_awake boolean default false,
  awake_since timestamptz,
  last_seen timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.presence enable row level security;

create policy "Presence viewable by circle members"
  on public.presence for select
  using (
    user_id in (
      select cm2.user_id from circle_members cm1
      join circle_members cm2 on cm1.circle_id = cm2.circle_id
      where cm1.user_id = auth.uid()
    )
  );

create policy "Users can update own presence"
  on public.presence for update
  using (user_id = auth.uid());

create policy "Users can insert own presence"
  on public.presence for insert
  with check (user_id = auth.uid());

-- Auto-create presence row on profile creation
create or replace function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.presence (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- Function to toggle awake status
create or replace function public.toggle_awake()
returns public.presence as $$
declare
  result public.presence;
begin
  update public.presence
  set
    is_awake = not is_awake,
    awake_since = case when not is_awake then now() else null end,
    last_seen = now(),
    updated_at = now()
  where user_id = auth.uid()
  returning * into result;
  return result;
end;
$$ language plpgsql security definer;


-- 5. THOUGHTS (moodboard)
-- ============================================================
create table public.thoughts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references public.circles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) <= 500),
  created_at timestamptz default now()
);

alter table public.thoughts enable row level security;

create policy "Thoughts viewable by circle members"
  on public.thoughts for select
  using (
    circle_id in (select circle_id from circle_members where user_id = auth.uid())
  );

create policy "Members can post thoughts"
  on public.thoughts for insert
  with check (
    author_id = auth.uid()
    and circle_id in (select circle_id from circle_members where user_id = auth.uid())
  );

create policy "Authors can delete own thoughts"
  on public.thoughts for delete
  using (author_id = auth.uid());

create index idx_thoughts_circle_created on public.thoughts(circle_id, created_at desc);


-- 6. MESSAGES (group chat)
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references public.circles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) <= 2000),
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Messages viewable by circle members"
  on public.messages for select
  using (
    circle_id in (select circle_id from circle_members where user_id = auth.uid())
  );

create policy "Members can send messages"
  on public.messages for insert
  with check (
    author_id = auth.uid()
    and circle_id in (select circle_id from circle_members where user_id = auth.uid())
  );

create index idx_messages_circle_created on public.messages(circle_id, created_at desc);


-- 7. SHARED CONTENT (links, videos)
-- ============================================================
create table public.shared_content (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references public.circles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('link', 'video', 'image')),
  url text not null,
  title text,
  source text, -- domain extracted from url
  created_at timestamptz default now()
);

alter table public.shared_content enable row level security;

create policy "Shared content viewable by circle members"
  on public.shared_content for select
  using (
    circle_id in (select circle_id from circle_members where user_id = auth.uid())
  );

create policy "Members can share content"
  on public.shared_content for insert
  with check (
    author_id = auth.uid()
    and circle_id in (select circle_id from circle_members where user_id = auth.uid())
  );

create policy "Authors can delete shared content"
  on public.shared_content for delete
  using (author_id = auth.uid());

create index idx_shared_circle_created on public.shared_content(circle_id, created_at desc);


-- 8. REQUESTS (favors)
-- ============================================================
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references public.circles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) <= 500),
  status text default 'open' check (status in ('open', 'claimed', 'done')),
  claimed_by uuid references public.profiles(id),
  claimed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.requests enable row level security;

create policy "Requests viewable by circle members"
  on public.requests for select
  using (
    circle_id in (select circle_id from circle_members where user_id = auth.uid())
  );

create policy "Members can create requests"
  on public.requests for insert
  with check (
    author_id = auth.uid()
    and circle_id in (select circle_id from circle_members where user_id = auth.uid())
  );

create policy "Members can claim requests"
  on public.requests for update
  using (
    circle_id in (select circle_id from circle_members where user_id = auth.uid())
  );

create index idx_requests_circle_status on public.requests(circle_id, status, created_at desc);

-- Function to claim a request
create or replace function public.claim_request(request_id uuid)
returns public.requests as $$
declare
  result public.requests;
begin
  update public.requests
  set
    status = 'claimed',
    claimed_by = auth.uid(),
    claimed_at = now()
  where id = request_id
    and status = 'open'
  returning * into result;
  return result;
end;
$$ language plpgsql security definer;


-- ============================================================
-- ENABLE REALTIME on key tables
-- ============================================================
alter publication supabase_realtime add table public.presence;
alter publication supabase_realtime add table public.thoughts;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.requests;
alter publication supabase_realtime add table public.shared_content;


-- ============================================================
-- HELPER: Join circle by invite code
-- ============================================================
create or replace function public.join_circle(code text)
returns public.circles as $$
declare
  target_circle public.circles;
begin
  select * into target_circle from public.circles where invite_code = code;
  if target_circle is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.circle_members (circle_id, user_id)
  values (target_circle.id, auth.uid())
  on conflict do nothing;

  return target_circle;
end;
$$ language plpgsql security definer;
