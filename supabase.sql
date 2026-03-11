create table if not exists public.snake_scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(trim(name)) between 1 and 24),
  score integer not null check (score >= 0 and score <= 9999),
  achieved_at timestamptz not null default now()
);

alter table public.snake_scores enable row level security;

create policy "snake_scores_select"
on public.snake_scores
for select
using (true);

create policy "snake_scores_insert"
on public.snake_scores
for insert
with check (
  char_length(trim(name)) between 1 and 24
  and score >= 0
  and score <= 9999
);