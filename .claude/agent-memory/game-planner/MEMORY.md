# Memoria de game-planner

## Sugerencias

Total sobre 30 (Estética, Contrato, Leaderboard, Catálogo, Reutilización, Esfuerzo; 1-5 cada uno).

| Fecha      | ID propuesto | Título      | Categoría | Estado   | Motivo (una línea)                                                          |
| ---------- | ------------ | ----------- | --------- | -------- | --------------------------------------------------------------------------- |
| 2026-10-22 | invasores    | INVASORES   | SHOOTER   | sugerido | RECOMENDADO #1. Simulación existente, S/M, reutiliza ROCAS. 26.             |
| 2026-10-22 | ranaria      | RANARIA     | ARCADE    | sugerido | Simulación existente; grid + carriles, M, sin assets. 23.                   |
| 2026-10-22 | gloton       | GLOTÓN      | ARCADE    | sugerido | Simulación existente; IA 4 fantasmas + laberinto, L. 23.                    |
| 2026-10-22 | duelo-pixel  | DUELO PIXEL | VERSUS    | sugerido | Simulación existente; 2J local choca con leaderboard por usuario. 21.       |
| 2026-10-22 | fusion       | FUSIÓN      | PUZZLE    | sugerido | 2048 neón; mejor fila nueva para PUZZLE, S. 25.                             |
| 2026-10-22 | burbujas     | BURBUJAS    | PUZZLE    | sugerido | Bubble shooter; apuntar con ratón, M. 25.                                   |
| 2026-10-22 | misiles      | MISILES     | SHOOTER   | sugerido | Missile Command con ratón; explosiones/audio de ROCAS. 25.                  |
| 2026-10-22 | aleteo       | ALETEO      | ARCADE    | sugerido | Flappy; una tecla, muy barato. 25.                                          |
| 2026-10-22 | ciempies     | CIEMPIÉS    | SHOOTER   | sugerido | Centipede; segmentos + hongos, M. 24.                                       |
| 2026-10-22 | eco          | ECO         | PUZZLE    | sugerido | Simon de memoria; S, puntuación = longitud de secuencia. 24.                |
| 2026-10-22 | gemas        | GEMAS       | PUZZLE    | sugerido | Columns; reutiliza grid de CAÍDA pero mecánica parecida. 24.                |
| 2026-10-22 | alunizaje    | ALUNIZAJE   | ARCADE    | sugerido | Lunar Lander; física de ROCAS. 24.                                          |
| 2026-10-22 | estela       | ESTELA      | VERSUS    | sugerido | Tron vs CPU; resuelve VERSUS sin 2J; grid de SERPENTINA. 24.                |
| 2026-10-22 | corredor     | CORREDOR    | ARCADE    | sugerido | Runner infinito; S pero poco distintivo. 23.                                |
| 2026-10-22 | enjambre     | ENJAMBRE    | SHOOTER   | sugerido | Galaga; duplica INVASORES. 22.                                              |
| 2026-10-22 | territorio   | TERRITORIO  | ARCADE    | sugerido | Qix; relleno de áreas costoso. 21.                                          |
| 2026-10-22 | disco        | DISCO       | VERSUS    | sugerido | Air hockey vs CPU; ranking poco significativo. 21.                          |
| 2026-10-22 | tanques      | TANQUES     | VERSUS    | sugerido | Combat vs CPU; IA + mapas, M/L. 20.                                         |
| 2026-10-22 | buscaminas   | BUSCAMINAS  | PUZZLE    | sugerido | Puntuación por tiempo encaja mal en ranking ascendente. 19.                 |
| 2026-10-22 | excavador    | EXCAVADOR   | ARCADE    | sugerido | Dig Dug; L y sin referencias. 19.                                           |

## Estado del catálogo (verificado 2026-10-22)

- Reales (registry): rocas, caida, bloque-buster, serpentina. Simulados: gloton, invasores, ranaria, duelo-pixel.
- Specs hasta la 09; ninguna spec de juego en curso.
- Las 16 ideas que no están en el catálogo requieren fila nueva en `games` (migración) y una clase de cubierta.

## Notas

- Ver [decisiones.md](decisiones.md) para los criterios aprendidos del usuario.
