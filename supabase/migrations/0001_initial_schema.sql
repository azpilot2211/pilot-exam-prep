create extension if not exists "pgcrypto";

create table chapters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  stem text not null,
  acs_code text,
  figure_ref text,
  figure_image_url text,
  display_order int not null default 0,
  content_version text,
  created_at timestamptz not null default now()
);

create table answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  label text not null check (label in ('A', 'B', 'C')),
  text text not null,
  is_correct boolean not null default false,
  why text,
  created_at timestamptz not null default now(),
  unique (question_id, label)
);

create table question_content (
  question_id uuid primary key references questions(id) on delete cascade,
  concept_tested text,
  explanation text,
  source_citation text,
  memory_aid text,
  key_takeaway text,
  illustration_svg text,
  audio_url text,
  published boolean not null default false,
  generated_at timestamptz,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_label text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);
create index attempts_user_question_idx on attempts (user_id, question_id);

alter table chapters enable row level security;
alter table questions enable row level security;
alter table answer_options enable row level security;
alter table question_content enable row level security;
alter table profiles enable row level security;
alter table attempts enable row level security;

create policy "chapters are public" on chapters
  for select using (true);

create policy "questions are public" on questions
  for select using (true);

create policy "answer options are public" on answer_options
  for select using (true);

create policy "published content is public" on question_content
  for select using (published = true);

create policy "users read own profile" on profiles
  for select using (auth.uid() = id);
create policy "users upsert own profile" on profiles
  for insert with check (auth.uid() = id);
create policy "users update own profile" on profiles
  for update using (auth.uid() = id);

create policy "users read own attempts" on attempts
  for select using (auth.uid() = user_id);
create policy "users insert own attempts" on attempts
  for insert with check (auth.uid() = user_id);
