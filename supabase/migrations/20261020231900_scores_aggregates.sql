-- Spec 08: agregados de lectura. Vistas (no RPC): son solo select y no necesitan
-- parámetros. security_invoker hace que respeten la RLS de scores y profiles.
-- Ninguna toca auth.users, así que no hay forma de exponer emails.

-- best y plays por juego. Parte de games para que los juegos sin partidas
-- aparezcan con best = 0 y plays = 0.
create view public.game_stats
with (security_invoker = true) as
select
  g.id as game_id,
  coalesce(max(s.score), 0)::int as best,
  count(s.id)::int as plays
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;

-- Ranking de jugadores: mejor puntuación por usuario (en cualquier juego),
-- con el total acumulado y el número de partidas.
create view public.top_players
with (security_invoker = true) as
select
  p.id as user_id,
  p.username,
  max(s.score)::int as best,
  sum(s.score)::bigint as total,
  count(s.id)::int as plays
from public.scores s
join public.profiles p on p.id = s.user_id
group by p.id, p.username;

-- Solo lectura.
revoke insert, update, delete, truncate on public.game_stats from anon, authenticated;
revoke insert, update, delete, truncate on public.top_players from anon, authenticated;
