-- Game jam "Frogger: cruza la carretera y el río sin convertirse en papilla".
-- PAPILLA entra en el catálogo. La tabla ya tiene RLS de solo lectura pública
-- (spec 07); no se tocan políticas.
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  (
    'papilla',
    'PAPILLA',
    'Cruza antes que el sapo. O acaba en papilla.',
    'Una rana con prisa y un sapo tramposo se disputan los cinco nenúfares del otro lado. Esquiva camiones de la basura, salta de tronco en tortuga y llega primero. Si te aplastan, que al menos sea con estilo.',
    'VERSUS',
    'cover-papilla',
    'magenta',
    9
  );
