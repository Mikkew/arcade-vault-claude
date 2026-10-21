-- Spec 08: puntuaciones. Una puntuación es inmutable: solo se inserta y se lee.

create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  score int not null check (score >= 0 and score <= 10000000),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_user_idx on public.scores (user_id);
create index scores_created_idx on public.scores (created_at desc);

alter table public.scores enable row level security;

-- lectura pública: el leaderboard lo ven también los visitantes
create policy "scores_select_public" on public.scores
  for select to anon, authenticated using (true);

-- solo con sesión y solo a nombre propio (user_id también tiene default auth.uid())
create policy "scores_insert_own" on public.scores
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Sin política de update/delete. Además se retiran los privilegios de
-- escritura como defensa en profundidad; authenticated conserva solo insert.
revoke insert, update, delete, truncate on public.scores from anon;
revoke update, delete, truncate on public.scores from authenticated;
