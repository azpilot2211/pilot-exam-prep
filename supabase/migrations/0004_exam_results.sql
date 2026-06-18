-- supabase/migrations/0004_exam_results.sql
create table if not exists exam_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null,
  total int not null,
  taken_at timestamptz not null default now(),
  breakdown jsonb not null default '{}'
);

alter table exam_results enable row level security;

create policy "users manage own exam results"
  on exam_results for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
