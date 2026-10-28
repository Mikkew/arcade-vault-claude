// ===== engine.ts — bucle, reglas, entrada y dibujo de Ranaria =====
// Independiente de React. Se comunica con el HUD de la plataforma por callbacks.
import type { CreateEngine } from "@/lib/engine/types";
import { createAudio } from "./audio";
import {
  advanceLanes,
  colCenter,
  createLanes,
  effectiveSpeed,
  hopTarget,
  laneAt,
  riverSupport,
  roadHit,
  turtleState,
} from "./lanes";
import {
  ASPHALT_COLOR,
  BG_COLOR,
  CELL,
  DYING_MS,
  EXTRA_LIFE_EVERY,
  FLIP_BANNER_MS,
  FLIP_COLOR,
  FROG_COLOR,
  GRASS_COLOR,
  H,
  HOME_ROW,
  HOP_COOLDOWN_MS,
  HOP_MS,
  LANE_LINE_COLOR,
  LOG_COLOR,
  MAX_DT,
  MAX_INPUT_QUEUE,
  MAX_LEVEL,
  MAX_LIVES,
  MEDIAN_ROW,
  NORTH_ROW,
  PICKUP_POINTS,
  POND_COLOR,
  POND_COLS,
  REED_COLOR,
  RESCUE_POINTS,
  RIVER_COLOR,
  RIVER_ROWS,
  ROAD_ROWS,
  ROUND_BONUS,
  ROUND_CLEAR_MS,
  START_COL,
  START_LIVES,
  STEP_MS,
  STEP_POINTS,
  TADPOLE_COLOR,
  TADPOLES,
  TEXT_COLOR,
  TIME_BONUS_PER_S,
  TIME_COLOR,
  TIME_WARN_COLOR,
  TIME_WARN_MS,
  TURTLE_COLOR,
  W,
  tripMs,
  type DeathCause,
  type Frog,
  type Lane,
  type Move,
  type RanariaState,
  type Rng,
  type TadpoleState,
} from "./types";
const KEY_MOVE: Record<string, Move> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};
const VEHICLE_COLORS: Record<string, string> = {
  truck: "#ff8a00",
  van: "#b8c0d0",
  car: "#00f5ff",
  sports: "#ff2bd6",
};
const rowCenter = (row: number) => row * CELL + CELL / 2;
const pondCenter = (i: number) => POND_COLS[i] * CELL + CELL;
const newFrog = (): Frog => ({
  x: colCenter(START_COL),
  row: HOME_ROW,
  state: "alive",
  timer: 0,
  bestUp: HOME_ROW,
  bestDown: NORTH_ROW,
  carrying: null,
  cause: null,
  hopT: 0,
});
export const createRanariaGame: CreateEngine = (canvas, callbacks) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  canvas.width = W;
  canvas.height = H;
  // Inyectable para reproducir partidas al depurar
  const rng: Rng = Math.random;
  let raf = 0;
  let last = 0;
  let paused = false;
  let over = false;
  let acc = 0; // ms acumulados hacia el siguiente paso
  let s: RanariaState;
  const audio = createAudio();
  const isEditable = (t: EventTarget | null) =>
    t instanceof HTMLElement &&
    (t.isContentEditable ||
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement);
  const gameOver = () => {
    if (over) return;
    over = true;
    s.phase = "over";
    s.input = [];
    callbacks.onGameOver(s.score);
  };
  const addScore = (points: number) => {
    s.score += points;
    callbacks.onScore(s.score);
    while (s.score >= s.nextExtraLife) {
      s.nextExtraLife += EXTRA_LIFE_EVERY;
      if (s.lives < MAX_LIVES) {
        s.lives++;
        callbacks.onLives?.(s.lives);
      }
    }
  };
  const reset = () => {
    s = {
      lanes: createLanes(1, rng),
      frog: newFrog(),
      tadpoles: Array.from({ length: TADPOLES }, () => "waiting"),
      reversed: false,
      flipBanner: 0,
      timeLeft: tripMs(1),
      clock: 0,
      input: [],
      hopCooldown: 0,
      phase: "play",
      clearLeft: 0,
      level: 1,
      score: 0,
      lives: START_LIVES,
      nextExtraLife: EXTRA_LIFE_EVERY,
    };
    acc = 0;
    callbacks.onScore(s.score);
    callbacks.onLives?.(s.lives);
    callbacks.onLevel?.(s.level);
  };
  const respawn = () => {
    s.frog = newFrog();
    s.timeLeft = tripMs(s.level);
    s.input = [];
  };
  const kill = (cause: DeathCause) => {
    const f = s.frog;
    f.state = "dying";
    f.cause = cause;
    f.timer = DYING_MS;
    // El renacuajo vuelve a su charca y los carriles a su sentido
    if (f.carrying !== null) {
      s.tadpoles[f.carrying] = "waiting";
      f.carrying = null;
      s.reversed = false;
      s.flipBanner = 0;
    }
    s.lives = Math.max(0, s.lives - 1);
    s.input = [];
    callbacks.onLives?.(s.lives);
    audio.play("splat");
  };
  const pickUp = () => {
    const f = s.frog;
    const col = Math.floor(f.x / CELL);
    const i = POND_COLS.findIndex((c) => col === c || col === c + 1);
    if (i < 0 || s.tadpoles[i] !== "waiting") return; // orilla o charca vacía
    s.tadpoles[i] = "carried";
    f.carrying = i;
    f.bestDown = NORTH_ROW;
    s.reversed = true;
    s.flipBanner = FLIP_BANNER_MS;
    audio.play("pickup");
    addScore(PICKUP_POINTS);
  };
  const rescue = () => {
    const f = s.frog;
    if (f.carrying === null) return;
    s.tadpoles[f.carrying] = "rescued";
    f.carrying = null;
    f.bestUp = HOME_ROW;
    s.reversed = false;
    s.flipBanner = 0;
    const points =
      RESCUE_POINTS + TIME_BONUS_PER_S * Math.floor(s.timeLeft / 1000);
    s.timeLeft = tripMs(s.level);
    audio.play("rescue");
    addScore(points);
    if (s.tadpoles.every((t) => t === "rescued")) {
      s.phase = "roundClear";
      s.clearLeft = ROUND_CLEAR_MS;
      s.input = [];
      addScore(ROUND_BONUS * s.level);
    }
  };
  // Atropello, agua o borde en la casilla actual
  const checkFrog = () => {
    const f = s.frog;
    if (f.state !== "alive") return;
    const lane = laneAt(s.lanes, f.row);
    if (!lane) return; // tierra
    if (lane.def.kind === "road") {
      if (roadHit(lane, f.x)) kill("road");
    } else if (f.x < 0 || f.x > W) kill("edge");
    else if (!riverSupport(lane, f.x, s.clock)) kill("water");
  };
  const carry = (dt: number) => {
    const f = s.frog;
    const lane = laneAt(s.lanes, f.row);
    if (lane?.def.kind !== "river") return;
    if (riverSupport(lane, f.x, s.clock))
      f.x += (effectiveSpeed(lane, s.reversed) * dt) / 1000;
  };
  const hop = (move: Move) => {
    const f = s.frog;
    const { row, x } = hopTarget(f, move);
    if (row === f.row && x === f.x) return; // contra el borde
    f.row = row;
    f.x = x;
    f.hopT = HOP_MS;
    audio.play("hop");
    // Filas nuevas en la dirección del viaje: arriba en la ida, abajo en la vuelta
    if (f.carrying === null && row < f.bestUp) {
      f.bestUp = row;
      addScore(STEP_POINTS);
    } else if (f.carrying !== null && row > f.bestDown) {
      f.bestDown = row;
      addScore(STEP_POINTS);
    }
    if (row === NORTH_ROW) {
      if (f.carrying === null) pickUp();
    } else if (row === HOME_ROW) rescue();
    else checkFrog();
  };
  const nextRound = () => {
    s.level = Math.min(MAX_LEVEL, s.level + 1);
    callbacks.onLevel?.(s.level);
    s.lanes = createLanes(s.level, rng);
    s.tadpoles = Array.from({ length: TADPOLES }, () => "waiting");
    s.reversed = false;
    s.flipBanner = 0;
    s.phase = "play";
    s.hopCooldown = 0;
    respawn();
  };
  const step = (dt: number) => {
    s.clock += dt;
    advanceLanes(s.lanes, s.reversed, dt);
    s.flipBanner = Math.max(0, s.flipBanner - dt);
    const f = s.frog;
    f.hopT = Math.max(0, f.hopT - dt);
    if (s.phase === "roundClear") {
      s.clearLeft -= dt;
      if (s.clearLeft <= 0) nextRound();
      return;
    }
    s.hopCooldown -= dt;
    if (f.state === "alive") {
      const move = s.input.shift();
      if (move && s.hopCooldown <= 0) {
        hop(move);
        s.hopCooldown = HOP_COOLDOWN_MS;
      } else if (move) s.input.unshift(move);
    }
    if (s.phase !== "play") return; // el último rescate cierra la ronda
    if (f.state === "alive") {
      carry(dt);
      checkFrog();
    }
    if (f.state === "alive") {
      s.timeLeft -= dt;
      if (s.timeLeft <= 0) kill("time");
    } else if ((f.timer -= dt) <= 0) {
      if (s.lives > 0) respawn();
      else gameOver();
    }
  };
  const update = (dt: number) => {
    acc += dt * 1000;
    while (acc >= STEP_MS && !over) {
      acc -= STEP_MS;
      step(STEP_MS);
    }
  };
  const queueMove = (move: Move) => {
    if (paused || over || s.phase !== "play") return;
    if (s.input.length < MAX_INPUT_QUEUE) s.input.push(move);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const move = KEY_MOVE[e.code];
    if (!move || isEditable(e.target)) return;
    e.preventDefault(); // evita el scroll de la página
    if (e.repeat) return;
    queueMove(move);
  };
  const onBlur = () => {
    s.input = [];
  };
  // ----- dibujo -----
  const drawTadpole = (
    x: number,
    y: number,
    color: string,
    scale = 1,
    outline = false,
  ) => {
    // Cabeza redonda y cola que ondula con el reloj
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    const wag = Math.sin(s.clock / 120) * 4;
    ctx.quadraticCurveTo(10, wag, 16, -wag);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 5, 0, 0, Math.PI * 2);
    if (outline) ctx.stroke();
    else ctx.fill();
    if (!outline) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-2, -1.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  const drawBackground = () => {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, CELL);
    // Orilla norte: hierba con juncos y cinco charcas
    ctx.fillStyle = GRASS_COLOR;
    ctx.fillRect(0, NORTH_ROW * CELL, W, CELL);
    ctx.fillStyle = REED_COLOR;
    for (let x = 6; x < W; x += 14)
      ctx.fillRect(x, NORTH_ROW * CELL + 6 + (x % 3) * 3, 3, CELL - 18);
    POND_COLS.forEach((_, i) => {
      ctx.fillStyle = POND_COLOR;
      ctx.beginPath();
      ctx.ellipse(
        pondCenter(i),
        rowCenter(NORTH_ROW),
        CELL - 8,
        CELL / 2 - 7,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      if (s.tadpoles[i] === "waiting")
        drawTadpole(pondCenter(i) - 4, rowCenter(NORTH_ROW), TADPOLE_COLOR);
    });
    // Río con ondas que avanzan en el sentido de la corriente
    ctx.fillStyle = RIVER_COLOR;
    ctx.fillRect(0, RIVER_ROWS[0] * CELL, W, RIVER_ROWS.length * CELL);
    ctx.strokeStyle = "rgba(0, 245, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const row of RIVER_ROWS) {
      const y = row * CELL + 34;
      const off = ((s.clock / 40) % 60) - 60;
      for (let x = off; x < W; x += 60) {
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 15, y - 5, x + 30, y);
      }
    }
    ctx.stroke();
    // Mediana y estanque de casa
    for (const row of [MEDIAN_ROW, HOME_ROW]) {
      ctx.fillStyle = GRASS_COLOR;
      ctx.fillRect(0, row * CELL, W, CELL);
      ctx.fillStyle = REED_COLOR;
      ctx.fillRect(0, row * CELL, W, 2);
      ctx.fillRect(0, row * CELL + CELL - 2, W, 2);
    }
    // Agua del estanque: la orilla de entrega
    ctx.fillStyle = "rgba(26, 79, 156, 0.45)";
    ctx.fillRect(0, HOME_ROW * CELL + 30, W, CELL - 32);
    // Asfalto con líneas de carril discontinuas
    ctx.fillStyle = ASPHALT_COLOR;
    ctx.fillRect(0, ROAD_ROWS[0] * CELL, W, ROAD_ROWS.length * CELL);
    ctx.fillStyle = LANE_LINE_COLOR;
    for (let i = 1; i < ROAD_ROWS.length; i++) {
      const y = (ROAD_ROWS[0] + i) * CELL - 1;
      for (let x = 8; x < W; x += 40) ctx.fillRect(x, y, 22, 3);
    }
  };
  const drawVehicle = (lane: Lane, ox: number, len: number) => {
    const kind = lane.def.obj;
    const dir = effectiveSpeed(lane, s.reversed) > 0 ? 1 : -1;
    const y = lane.def.row * CELL;
    const front = dir > 0 ? ox + len : ox;
    const h = kind === "truck" ? 38 : kind === "van" ? 34 : 30;
    const top = y + (CELL - h) / 2;
    // Reflejo de los faros sobre el asfalto
    const g = ctx.createLinearGradient(front, 0, front + dir * 70, 0);
    g.addColorStop(0, "rgba(255, 250, 200, 0.18)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(front, top + 6);
    ctx.lineTo(front + dir * 70, top - 6);
    ctx.lineTo(front + dir * 70, top + h + 6);
    ctx.lineTo(front, top + h - 6);
    ctx.fill();
    ctx.fillStyle = VEHICLE_COLORS[kind];
    ctx.beginPath();
    ctx.roundRect(ox + 2, top, len - 4, h, kind === "sports" ? 10 : 5);
    ctx.fill();
    ctx.fillStyle = "rgba(5, 7, 13, 0.75)";
    if (kind === "truck") {
      // Cabina delante y separación con la caja
      const cab = dir > 0 ? ox + len - 30 : ox + 4;
      ctx.fillRect(cab + 8, top + 6, 14, h - 12);
      ctx.fillRect(dir > 0 ? cab - 2 : cab + 28, top + 2, 3, h - 4);
    } else {
      const glass = dir > 0 ? ox + len - 22 : ox + 10;
      ctx.fillRect(glass, top + 5, 12, h - 10);
    }
    ctx.shadowColor = "#fffad0";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#fffad0";
    const lx = front - dir * 4;
    ctx.fillRect(lx - 2, top + 3, 4, 5);
    ctx.fillRect(lx - 2, top + h - 8, 4, 5);
    ctx.shadowBlur = 0;
  };
  const drawLog = (ox: number, len: number, row: number) => {
    const top = row * CELL + 8;
    ctx.fillStyle = LOG_COLOR;
    ctx.beginPath();
    ctx.roundRect(ox + 2, top, len - 4, CELL - 16, 14);
    ctx.fill();
    // Vetas
    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = ox + 24; x < ox + len - 20; x += 38) {
      ctx.moveTo(x, top + 9);
      ctx.lineTo(x + 18, top + 9);
      ctx.moveTo(x + 10, top + CELL - 26);
      ctx.lineTo(x + 26, top + CELL - 26);
    }
    ctx.stroke();
    ctx.strokeStyle = "#c08a50";
    ctx.beginPath();
    ctx.ellipse(ox + len - 10, top + (CELL - 16) / 2, 5, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
  };
  const drawTurtles = (ox: number, len: number, row: number, alpha: number) => {
    const n = Math.round(len / CELL);
    const cy = rowCenter(row);
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      const cx = ox + i * CELL + CELL / 2;
      ctx.fillStyle = "#0e5a4e";
      ctx.beginPath();
      ctx.arc(cx, cy, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TURTLE_COLOR;
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.fill();
      // Escamas del caparazón
      ctx.strokeStyle = "rgba(5, 7, 13, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.moveTo(cx - 15, cy);
      ctx.lineTo(cx - 7, cy);
      ctx.moveTo(cx + 7, cy);
      ctx.lineTo(cx + 15, cy);
      ctx.stroke();
    }
    ctx.restore();
  };
  const drawLanes = () => {
    for (const lane of s.lanes) {
      for (const o of lane.objects) {
        if (o.x > W || o.x + o.length < 0) continue;
        if (lane.def.kind === "road") drawVehicle(lane, o.x, o.length);
        else if (lane.def.obj === "logLong" || lane.def.obj === "logMid")
          drawLog(o.x, o.length, lane.def.row);
        else {
          const t = turtleState(o, s.clock);
          if (t === "under") {
            // Solo quedan las ondas donde estaban
            ctx.strokeStyle = "rgba(31, 158, 138, 0.35)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(
              o.x + o.length / 2,
              rowCenter(lane.def.row),
              o.length / 2 - 6,
              8,
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          } else
            drawTurtles(
              o.x,
              o.length,
              lane.def.row,
              t === "sinking" && Math.floor(s.clock / 150) % 2 ? 0.35 : 1,
            );
        }
      }
    }
  };
  // Flechas tenues en los bordes de cada carril con el sentido nuevo
  const drawFlipArrows = () => {
    if (!s.reversed) return;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(s.clock / 150);
    ctx.fillStyle = FLIP_COLOR;
    for (const lane of s.lanes) {
      const dir = effectiveSpeed(lane, true) > 0 ? 1 : -1;
      const cy = rowCenter(lane.def.row);
      for (const ex of [12, W - 12]) {
        ctx.beginPath();
        ctx.moveTo(ex + dir * 7, cy);
        ctx.lineTo(ex - dir * 5, cy - 8);
        ctx.lineTo(ex - dir * 5, cy + 8);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  };
  const drawFrog = (f: Frog) => {
    const cy = rowCenter(f.row);
    const stretch = f.hopT > 0 ? 1.18 : 1;
    ctx.save();
    ctx.translate(f.x, cy);
    ctx.scale(1 / stretch, stretch);
    ctx.shadowColor = FROG_COLOR;
    ctx.shadowBlur = 12;
    ctx.fillStyle = FROG_COLOR;
    // Patas: más abiertas durante el salto
    const spread = f.hopT > 0 ? 3 : 0;
    for (const sx of [-1, 1]) {
      ctx.fillRect(sx * (12 + spread) - 3, -12 - spread, 6, 8);
      ctx.fillRect(sx * (13 + spread) - 3, 6 + spread, 6, 9);
    }
    ctx.beginPath();
    ctx.ellipse(0, 1, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    for (const sx of [-1, 1]) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx * 6, -9, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#05070d";
      ctx.beginPath();
      ctx.arc(sx * 6, -10, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // El renacuajo va a cuestas, sobre el lomo
    if (f.carrying !== null) drawTadpole(f.x - 3, cy + 3, TADPOLE_COLOR, 0.9);
  };
  // Mancha simple que se desvanece durante la muerte
  const drawDeath = (f: Frog) => {
    const cy = rowCenter(f.row);
    const t = 1 - f.timer / DYING_MS;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    if (f.cause === "water" || f.cause === "edge") {
      ctx.strokeStyle = TIME_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, cy, 8 + t * 18, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = FROG_COLOR;
      ctx.beginPath();
      ctx.ellipse(f.x, cy, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const [dx, dy] of [
        [-16, -8],
        [15, -6],
        [-12, 9],
        [14, 8],
      ]) {
        ctx.beginPath();
        ctx.arc(f.x + dx, cy + dy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };
  const tadpoleIconColor = (t: TadpoleState) =>
    t === "rescued" ? FROG_COLOR : t === "carried" ? FLIP_COLOR : TEXT_COLOR;
  const drawTopStrip = () => {
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText("RENACUAJOS", 16, CELL / 2);
    // Hueco: en la charca · amarillo: a cuestas · verde: rescatado
    s.tadpoles.forEach((t, i) =>
      drawTadpole(
        136 + i * 34,
        CELL / 2,
        tadpoleIconColor(t),
        1,
        t === "waiting",
      ),
    );
    // Barra de tiempo del viaje
    const warn = s.timeLeft <= TIME_WARN_MS;
    const bx = 420;
    const bw = W - bx - 16;
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = "bold 12px monospace";
    ctx.fillText("TIEMPO", bx - 64, CELL / 2);
    ctx.fillStyle = "rgba(232, 232, 255, 0.12)";
    ctx.fillRect(bx, 18, bw, 14);
    ctx.fillStyle = warn ? TIME_WARN_COLOR : TIME_COLOR;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.fillRect(bx, 18, bw * Math.max(0, s.timeLeft / tripMs(s.level)), 14);
    ctx.shadowBlur = 0;
  };
  const drawBanner = (text: string, color: string) => {
    ctx.fillStyle = "rgba(5, 7, 13, 0.78)";
    ctx.fillRect(0, MEDIAN_ROW * CELL - 20, W, CELL + 40);
    ctx.font = "bold 30px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillText(text, W / 2, rowCenter(MEDIAN_ROW));
    ctx.shadowBlur = 0;
  };
  const draw = () => {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);
    drawBackground();
    drawLanes();
    drawFlipArrows();
    const f = s.frog;
    if (f.state === "alive") drawFrog(f);
    else drawDeath(f);
    drawTopStrip();
    if (s.phase === "roundClear") drawBanner("¡CHARCA COMPLETA!", FROG_COLOR);
    else if (s.flipBanner > 0) drawBanner("¡A CONTRAMANO!", FLIP_COLOR);
  };
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    if (!paused && !over) update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onBlur);
  reset();
  last = performance.now();
  raf = requestAnimationFrame(frame);
  return {
    pause() {
      paused = true;
      s.input = [];
    },
    resume() {
      paused = false;
      last = performance.now();
    },
    end() {
      gameOver();
    },
    restart() {
      over = false;
      paused = false;
      reset();
      last = performance.now();
    },
    setMuted(m) {
      audio.setMuted(m);
    },
    setSkin() {}, // solo clasico: neon y retro tendrán su spec en specs/skins/
    // Cada toque de la cruceta es un salto; soltar no hace nada
    setInput(action, down) {
      if (!down || action === "a" || action === "b") return;
      queueMove(action);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      audio.destroy();
    },
  };
};
