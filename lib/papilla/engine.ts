// ===== engine.ts — bucle, reglas, entrada y dibujo de Papilla =====
// Independiente de React. Se comunica con el HUD de la plataforma por callbacks.
import type { CreateEngine } from "@/lib/engine/types";
import { createAudio } from "./audio";
import { createFx } from "./fx";
import {
  colCenter,
  createLanes,
  hopTarget,
  laneAt,
  nearestVehicleGap,
  objectX,
  riverSupport,
  roadHit,
  turtleState,
} from "./lanes";
import { decideRival, rivalThinkMs, slotCenter } from "./rival";
import {
  ASPHALT_COLOR,
  ATTEMPT_MS,
  BANK_COLOR,
  BG_COLOR,
  CELL,
  CLAIM_POINTS,
  DYING_MS,
  EXTRA_LIFE_EVERY,
  H,
  HEDGE_COLOR,
  HOME_MS,
  HOME_ROW,
  HOP_COOLDOWN_MS,
  HOP_MS,
  HORN_COOLDOWN_MS,
  LANE_LINE_COLOR,
  LOG_COLOR,
  MAX_DT,
  MAX_INPUT_QUEUE,
  MAX_LEVEL,
  MAX_LIVES,
  MEDIAN_ROW,
  PAD_COLOR,
  PLAYER_COLOR,
  PLAYER_START_COL,
  RIVAL_COLOR,
  RIVAL_RESPAWN_MS,
  RIVAL_SPLAT_POINTS,
  RIVAL_START_COL,
  RIVAL_TAUNTS,
  RIVER_COLOR,
  RIVER_ROWS,
  ROAD_ROWS,
  ROUND_CLEAR_MS,
  ROUND_WIN_BONUS,
  SLOT_COLS,
  SLOTS_TO_WIN,
  START_LIVES,
  START_ROW,
  STEP_MS,
  STEP_POINTS,
  TAUNT_MS,
  TEXT_COLOR,
  TIME_BONUS_PER_S,
  TIME_COLOR,
  TIME_WARN_COLOR,
  TIME_WARN_MS,
  TURTLE_COLOR,
  W,
  type DeathCause,
  type Frog,
  type Lane,
  type Move,
  type PapillaState,
  type Rng,
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
  truck: "#3fae5a",
  sports: "#f5ff00",
  car: "#00f5ff",
  cart: "#b8c0d0",
};
const rowCenter = (row: number) => row * CELL + CELL / 2;
const newFrog = (col: number): Frog => ({
  x: colCenter(col),
  row: START_ROW,
  state: "alive",
  timer: 0,
  bestRow: START_ROW,
  cause: null,
  hopT: 0,
});
export const createPapillaGame: CreateEngine = (canvas, callbacks) => {
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
  let hornCooldown = 0; // ms
  let taunt: { text: string; life: number } | null = null;
  let s: PapillaState;
  const audio = createAudio();
  const fx = createFx(rng);
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
        audio.play("extraLife");
      }
    }
  };
  const sayTaunt = (text: string) => {
    taunt = { text, life: TAUNT_MS };
  };
  const reset = () => {
    s = {
      lanes: createLanes(1, rng),
      player: newFrog(PLAYER_START_COL),
      rival: newFrog(RIVAL_START_COL),
      slots: SLOT_COLS.map(() => null),
      timeLeft: ATTEMPT_MS,
      rivalThink: rivalThinkMs(1),
      clock: 0,
      input: [],
      hopCooldown: 0,
      phase: "play",
      clearLeft: 0,
      roundWinner: null,
      level: 1,
      score: 0,
      lives: START_LIVES,
      nextExtraLife: EXTRA_LIFE_EVERY,
    };
    acc = 0;
    hornCooldown = 0;
    taunt = null;
    fx.clearAll();
    callbacks.onScore(s.score);
    callbacks.onLives?.(s.lives);
    callbacks.onLevel?.(s.level);
  };
  const respawnPlayer = () => {
    s.player = newFrog(PLAYER_START_COL);
    s.timeLeft = ATTEMPT_MS;
    s.input = [];
  };
  const respawnRival = () => {
    s.rival = newFrog(RIVAL_START_COL);
    s.rivalThink = rivalThinkMs(s.level);
  };
  const kill = (f: Frog, cause: DeathCause) => {
    const isPlayer = f === s.player;
    const color = isPlayer ? PLAYER_COLOR : RIVAL_COLOR;
    const y = rowCenter(f.row);
    f.state = "dying";
    f.cause = cause;
    f.timer = isPlayer ? DYING_MS : RIVAL_RESPAWN_MS;
    if (cause === "water" || cause === "edge") fx.drown(f.x, y);
    else fx.splat(f.x, y, color, ROAD_ROWS.includes(f.row));
    if (isPlayer) {
      s.lives = Math.max(0, s.lives - 1);
      s.input = [];
      callbacks.onLives?.(s.lives);
      fx.shake();
      audio.play(cause === "water" || cause === "edge" ? "drown" : "splat");
    } else {
      fx.text(f.x, y - 34, `+${RIVAL_SPLAT_POINTS} ¡PAPILLA!`, RIVAL_COLOR);
      audio.play("rivalSplat");
      addScore(RIVAL_SPLAT_POINTS);
    }
  };
  const checkRoundEnd = () => {
    if (s.slots.some((o) => o === null)) return;
    s.phase = "roundClear";
    s.clearLeft = ROUND_CLEAR_MS;
    s.input = [];
    const mine = s.slots.filter((o) => o === "player").length;
    if (mine >= SLOTS_TO_WIN) {
      s.roundWinner = "player";
      audio.play("roundWin");
      addScore(ROUND_WIN_BONUS * s.level);
    } else {
      s.roundWinner = "rival";
      s.lives = Math.max(0, s.lives - 1);
      callbacks.onLives?.(s.lives);
      audio.play("roundLose");
      sayTaunt(RIVAL_TAUNTS[RIVAL_TAUNTS.length - 1]);
    }
  };
  const arrive = (f: Frog) => {
    const col = Math.floor(f.x / CELL);
    const i = SLOT_COLS.findIndex((c) => col === c || col === c + 1);
    if (i < 0) return kill(f, "hedge");
    if (s.slots[i] !== null) return kill(f, "taken");
    const isPlayer = f === s.player;
    s.slots[i] = isPlayer ? "player" : "rival";
    f.state = "home";
    f.timer = HOME_MS;
    f.x = slotCenter(i);
    const y = rowCenter(HOME_ROW);
    if (isPlayer) {
      const points =
        CLAIM_POINTS + TIME_BONUS_PER_S * Math.floor(s.timeLeft / 1000);
      fx.flash(f.x, y, PLAYER_COLOR);
      fx.text(f.x, y + 10, `+${points}`, PLAYER_COLOR);
      audio.play("claim");
      addScore(points);
    } else {
      fx.flash(f.x, y, RIVAL_COLOR);
      audio.play("rivalClaim");
      sayTaunt(RIVAL_TAUNTS[Math.floor(rng() * (RIVAL_TAUNTS.length - 1))]);
    }
    checkRoundEnd();
  };
  // Atropello, agua o borde en la casilla actual
  const checkFrog = (f: Frog) => {
    if (f.state !== "alive") return;
    const lane = laneAt(s.lanes, f.row);
    if (!lane) return;
    if (lane.def.kind === "road") {
      if (roadHit(lane, f.x, s.clock)) kill(f, "road");
    } else if (f.x < 0 || f.x > W) kill(f, "edge");
    else if (!riverSupport(lane, f.x, s.clock)) kill(f, "water");
  };
  const carry = (f: Frog, dt: number) => {
    const lane = laneAt(s.lanes, f.row);
    if (lane?.def.kind !== "river") return;
    if (riverSupport(lane, f.x, s.clock)) f.x += (lane.speed * dt) / 1000;
  };
  const hop = (f: Frog, move: Move) => {
    if (move === "stay") return;
    const { row, x } = hopTarget(f, move);
    if (row === f.row && x === f.x) return; // contra el borde
    f.row = row;
    f.x = x;
    f.hopT = HOP_MS;
    if (f === s.player) {
      audio.play("hop");
      if (row < f.bestRow && row > HOME_ROW) {
        f.bestRow = row;
        addScore(STEP_POINTS);
      }
      const lane = laneAt(s.lanes, row);
      if (
        lane?.def.kind === "road" &&
        hornCooldown <= 0 &&
        nearestVehicleGap(lane, x, s.clock) < CELL
      ) {
        hornCooldown = HORN_COOLDOWN_MS;
        audio.play("horn");
      }
    }
    if (row === HOME_ROW) arrive(f);
    else checkFrog(f);
  };
  const nextRound = () => {
    if (s.lives <= 0) return gameOver();
    s.level = Math.min(MAX_LEVEL, s.level + 1);
    callbacks.onLevel?.(s.level);
    s.lanes = createLanes(s.level, rng);
    s.slots = SLOT_COLS.map(() => null);
    s.phase = "play";
    s.roundWinner = null;
    s.hopCooldown = 0;
    respawnPlayer();
    respawnRival();
    fx.clearRound();
  };
  const step = (dt: number) => {
    s.clock += dt;
    fx.update(dt);
    hornCooldown -= dt;
    if (taunt && (taunt.life -= dt) <= 0) taunt = null;
    s.player.hopT = Math.max(0, s.player.hopT - dt);
    s.rival.hopT = Math.max(0, s.rival.hopT - dt);
    if (s.phase === "roundClear") {
      s.clearLeft -= dt;
      if (s.clearLeft <= 0) nextRound();
      return;
    }
    // Rana del jugador: se procesa antes que el sapo, así gana los empates
    const p = s.player;
    s.hopCooldown -= dt;
    if (p.state === "alive") {
      const move = s.input.shift();
      if (move && s.hopCooldown <= 0) {
        hop(p, move);
        s.hopCooldown = HOP_COOLDOWN_MS;
      } else if (move) s.input.unshift(move);
    }
    if (p.state === "alive") {
      carry(p, dt);
      checkFrog(p);
    }
    if (p.state === "alive") {
      const before = Math.ceil(s.timeLeft / 1000);
      s.timeLeft -= dt;
      if (s.timeLeft <= 0) kill(p, "time");
      else if (
        s.timeLeft <= TIME_WARN_MS &&
        Math.ceil(s.timeLeft / 1000) !== before
      )
        audio.play("tick");
    } else if ((p.timer -= dt) <= 0) {
      if (p.state === "home") respawnPlayer();
      else if (s.lives > 0) respawnPlayer();
      else return gameOver();
    }
    if (s.phase !== "play") return;
    // Sapo rival
    const r = s.rival;
    if (r.state === "alive") {
      s.rivalThink -= dt;
      if (s.rivalThink <= 0) {
        s.rivalThink = rivalThinkMs(s.level);
        hop(r, decideRival(s, rng));
      }
      if (r.state === "alive") {
        carry(r, dt);
        checkFrog(r);
      }
    } else if ((r.timer -= dt) <= 0) respawnRival();
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
  const drawBackground = () => {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, CELL);
    // Orilla de llegada: seto con cinco huecos de agua y su nenúfar
    ctx.fillStyle = HEDGE_COLOR;
    ctx.fillRect(0, CELL, W, CELL);
    ctx.fillStyle = "rgba(0, 255, 136, 0.12)";
    for (let x = 6; x < W; x += 14) ctx.fillRect(x, CELL + 6, 6, CELL - 12);
    SLOT_COLS.forEach((c, i) => {
      ctx.fillStyle = RIVER_COLOR;
      ctx.fillRect(c * CELL, CELL, CELL * 2, CELL);
      const cx = slotCenter(i);
      const cy = rowCenter(HOME_ROW);
      ctx.fillStyle = PAD_COLOR;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 20, -Math.PI / 2 + 0.5, Math.PI * 1.5 - 0.1);
      ctx.closePath();
      ctx.fill();
    });
    // Río con ondas que avanzan
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
    // Mediana y acera de salida
    for (const row of [MEDIAN_ROW, START_ROW]) {
      ctx.fillStyle = BANK_COLOR;
      ctx.fillRect(0, row * CELL, W, CELL);
      ctx.fillStyle = "rgba(255, 0, 110, 0.14)";
      for (let x = 0; x < W; x += CELL) ctx.fillRect(x, row * CELL, 1, CELL);
      ctx.fillRect(0, row * CELL, W, 2);
      ctx.fillRect(0, row * CELL + CELL - 2, W, 2);
    }
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
    const dir = lane.speed > 0 ? 1 : -1;
    const y = lane.def.row * CELL;
    const front = dir > 0 ? ox + len : ox;
    const color = VEHICLE_COLORS[kind];
    const h = kind === "cart" ? 26 : kind === "truck" ? 38 : 30;
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
    if (kind === "cart") {
      // Carrito del súper: cesta de rejilla y ruedas
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ox + 6, top, len - 14, h - 8);
      ctx.beginPath();
      for (let x = ox + 12; x < ox + len - 8; x += 6) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, top + h - 8);
      }
      const handle = dir > 0 ? ox + 2 : ox + len - 2;
      ctx.moveTo(handle, top - 2);
      ctx.lineTo(dir > 0 ? ox + 6 : ox + len - 8, top + 4);
      ctx.stroke();
      ctx.fillStyle = color;
      for (const wx of [ox + 10, ox + len - 12]) {
        ctx.beginPath();
        ctx.arc(wx, top + h - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(ox + 2, top, len - 4, h, kind === "sports" ? 10 : 5);
    ctx.fill();
    ctx.fillStyle = "rgba(5, 7, 13, 0.75)";
    if (kind === "truck") {
      // Contenedor de la basura con franjas y cabina delante
      const cab = dir > 0 ? ox + len - 28 : ox + 4;
      ctx.fillRect(cab + (dir > 0 ? -3 : 24), top + 3, 3, h - 6);
      ctx.fillRect(cab + 6, top + 6, 14, h - 12);
      for (
        let x = dir > 0 ? ox + 10 : ox + 36;
        x < (dir > 0 ? ox + len - 34 : ox + len - 6);
        x += 12
      )
        ctx.fillRect(x, top + 4, 4, h - 8);
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
        const ox = objectX(o, lane, s.clock);
        if (ox > W || ox + o.length < 0) continue;
        if (lane.def.kind === "road") drawVehicle(lane, ox, o.length);
        else if (lane.def.obj === "logLong" || lane.def.obj === "logShort")
          drawLog(ox, o.length, lane.def.row);
        else {
          const t = turtleState(o, s.clock);
          if (t === "under") {
            // Solo quedan las ondas donde estaban
            ctx.strokeStyle = "rgba(31, 158, 138, 0.35)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(
              ox + o.length / 2,
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
              ox,
              o.length,
              lane.def.row,
              t === "sinking" && Math.floor(s.clock / 150) % 2 ? 0.35 : 1,
            );
        }
      }
    }
  };
  const drawFrog = (
    x: number,
    row: number,
    color: string,
    hopT: number,
    scale = 1,
  ) => {
    const cy = rowCenter(row);
    const stretch = hopT > 0 ? 1.18 : 1;
    ctx.save();
    ctx.translate(x, cy);
    ctx.scale(scale / stretch, scale * stretch);
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    // Patas
    for (const sx of [-1, 1]) {
      ctx.fillRect(sx * 12 - 3, -12, 6, 8);
      ctx.fillRect(sx * 13 - 3, 6, 6, 9);
    }
    ctx.beginPath();
    ctx.ellipse(0, 1, 13, 14, 0, 0, Math.PI * 2);
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
  };
  const drawTaunt = () => {
    if (!taunt) return;
    const r = s.rival;
    const x = Math.min(W - 70, Math.max(70, r.x));
    const y = Math.max(r.row, HOME_ROW + 1) * CELL - 14;
    ctx.save();
    ctx.globalAlpha = Math.min(1, taunt.life / 200);
    ctx.font = "bold 13px monospace";
    const w = ctx.measureText(taunt.text).width + 16;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 26, w, 22, 6);
    ctx.moveTo(x - 5, y - 4);
    ctx.lineTo(x, y + 4);
    ctx.lineTo(x + 5, y - 4);
    ctx.fill();
    ctx.fillStyle = RIVAL_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(taunt.text, x, y - 15);
    ctx.restore();
  };
  const drawTopStrip = () => {
    const mine = s.slots.filter((o) => o === "player").length;
    const theirs = s.slots.filter((o) => o === "rival").length;
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = PLAYER_COLOR;
    ctx.fillText(`TÚ ${mine}`, 16, CELL / 2);
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText("·", 84, CELL / 2);
    ctx.fillStyle = RIVAL_COLOR;
    ctx.fillText(`SAPO ${theirs}`, 104, CELL / 2);
    // Barra de tiempo del intento
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
    ctx.fillRect(bx, 18, bw * Math.max(0, s.timeLeft / ATTEMPT_MS), 14);
    ctx.shadowBlur = 0;
  };
  const drawBanner = () => {
    if (s.phase !== "roundClear") return;
    const win = s.roundWinner === "player";
    const color = win ? PLAYER_COLOR : RIVAL_COLOR;
    ctx.fillStyle = "rgba(5, 7, 13, 0.78)";
    ctx.fillRect(0, MEDIAN_ROW * CELL - 20, W, CELL + 40);
    ctx.font = "bold 30px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillText(
      win ? "¡RONDA PARA TI!" : "EL SAPO GANA LA RONDA",
      W / 2,
      rowCenter(MEDIAN_ROW),
    );
    ctx.shadowBlur = 0;
  };
  const draw = () => {
    const shake = fx.shakeOffset();
    ctx.save();
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(shake.x, shake.y);
    drawBackground();
    fx.drawUnder(ctx);
    drawLanes();
    s.slots.forEach((o, i) => {
      if (o)
        drawFrog(
          slotCenter(i),
          HOME_ROW,
          o === "player" ? PLAYER_COLOR : RIVAL_COLOR,
          0,
          0.8,
        );
    });
    const r = s.rival;
    if (r.state === "alive") drawFrog(r.x, r.row, RIVAL_COLOR, r.hopT, 1.08);
    const p = s.player;
    if (p.state === "alive") drawFrog(p.x, p.row, PLAYER_COLOR, p.hopT);
    fx.drawOver(ctx);
    drawTaunt();
    ctx.restore();
    drawTopStrip();
    drawBanner();
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
    setSkin() {}, // sin paletas todavía: tendrá su propio spec en specs/skins/
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
