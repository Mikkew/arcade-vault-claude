-- RANARIA pasa de simulación a juego real (game-jam/ranaria/01-motor).
-- Solo se actualiza el texto del catálogo; la fila, su portada, su color,
-- su sort_order y las políticas RLS de games no cambian.
update public.games
set
  short = 'Rescata a los renacuajos. Ida y vuelta.',
  long = 'Cinco renacuajos se han perdido al otro lado de la autopista y el río. Ve a por ellos de uno en uno y tráelos al estanque, pero cuidado: en cuanto llevas uno a cuestas, todo el tráfico cambia de sentido.'
where id = 'ranaria';
