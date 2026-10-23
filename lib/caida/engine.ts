// ===== engine.ts — bucle, estado, entrada y dibujo de Caída (Tetris) =====
// Independiente de React. Se comunica con el HUD de la plataforma por callbacks.
import type { CreateEngine } from "@/lib/engine/types";
import {
  BASE_DROP_MS,
  BLOCK,
  BOARD_X,
  BOARD_Y,
  COLORS,
  COLS,
  DROP_STEP_MS,
  FRAME_COLOR,
  GRID_LINE,
  H,
  HARD_DROP_POINTS,
  KICKS,
  LABEL_COLOR,
  LINES_PER_LEVEL,
  LINE_SCORES,
  MAX_DT,
  MIN_DROP_MS,
  PANEL_X,
  PIECES,
  ROWS,
  SOFT_DROP_POINTS,
  VALUE_COLOR,
  W,
  type Board,
  type Piece,
} from "./types";
// Teclas que el motor captura mientras está activo
const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyX",
  "Space",
]);
const createBoard = (): Board =>
  Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
const randomPiece = (): Piece => {
  const type = Math.floor(Math.random() * (PIECES.length - 1)) + 1;
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
};
const rotateCW = (shape: number[][]): number[][] => {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
};
export const createCaidaGame: CreateEngine = (canvas, callbacks) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  canvas.width = W;
  canvas.height = H;
  let raf = 0;
  let last = 0;
  let paused = false;
  let over = false;
  let board = createBoard();
  let current = randomPiece();
  let next = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = BASE_DROP_MS; // ms
  let dropAccum = 0; // ms
  const collide = (shape: number[][], ox: number, oy: number) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  };
  const addScore = (points: number) => {
    score += points;
    callbacks.onScore(score);
  };
  const endGame = () => {
    if (over) return;
    over = true;
    callbacks.onGameOver(score);
  };
  const tryRotate = () => {
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  };
  const merge = () => {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  };
  const clearLines = () => {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (!cleared) return;
    lines += cleared;
    const newLevel = Math.floor(lines / LINES_PER_LEVEL) + 1;
    addScore((LINE_SCORES[cleared] ?? 0) * level);
    if (newLevel !== level) {
      level = newLevel;
      callbacks.onLevel?.(level);
    }
    dropInterval = Math.max(
      MIN_DROP_MS,
      BASE_DROP_MS - (level - 1) * DROP_STEP_MS,
    );
  };
  const spawn = () => {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) endGame();
  };
  const lockPiece = () => {
    merge();
    clearLines();
    spawn();
  };
  const ghostY = () => {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  };
  const hardDrop = () => {
    const gy = ghostY();
    const cells = gy - current.y;
    current.y = gy;
    if (cells) addScore(cells * HARD_DROP_POINTS);
    lockPiece();
    dropAccum = 0;
  };
  const softDrop = () => {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      addScore(SOFT_DROP_POINTS);
    } else {
      lockPiece();
    }
    dropAccum = 0;
  };
  // ── Entrada ──
  const isEditable = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement);
  const onKeyDown = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code) || isEditable(e.target)) return;
    e.preventDefault(); // evita scroll y que Espacio active un botón enfocado
    if (paused || over) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        if (!e.repeat) hardDrop();
        break;
    }
  };
  // ── Dibujo ──
  const drawBlock = (x: number, y: number, colorIndex: number, alpha = 1) => {
    if (!colorIndex) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS[colorIndex]!;
    ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(x + 1, y + 1, BLOCK - 2, 4);
    ctx.globalAlpha = 1;
  };
  const drawShape = (piece: Piece, row: number, alpha = 1) => {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        drawBlock(
          BOARD_X + (piece.x + c) * BLOCK,
          BOARD_Y + (row + r) * BLOCK,
          piece.shape[r][c],
          alpha,
        );
  };
  const drawLabel = (text: string, value: string, y: number) => {
    ctx.textAlign = "left";
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = "12px monospace";
    ctx.fillText(text, PANEL_X, y);
    ctx.fillStyle = VALUE_COLOR;
    ctx.font = "28px monospace";
    ctx.fillText(value, PANEL_X, y + 34);
  };
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    // rejilla y marco del tablero
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + ROWS * BLOCK);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
      ctx.lineTo(BOARD_X + COLS * BLOCK, BOARD_Y + r * BLOCK);
    }
    ctx.stroke();
    ctx.strokeStyle = FRAME_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      BOARD_X - 1,
      BOARD_Y + 1,
      COLS * BLOCK + 2,
      ROWS * BLOCK - 2,
    );
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(BOARD_X + c * BLOCK, BOARD_Y + r * BLOCK, board[r][c]);
    if (!over) {
      drawShape(current, ghostY(), 0.2); // sombra de caída
      drawShape(current, current.y);
    }
    // panel lateral: siguiente pieza y líneas
    ctx.textAlign = "left";
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = "12px monospace";
    ctx.fillText("SIGUIENTE", PANEL_X, 40);
    const offX = Math.floor((4 - next.shape[0].length) / 2);
    const offY = Math.floor((4 - next.shape.length) / 2);
    for (let r = 0; r < next.shape.length; r++)
      for (let c = 0; c < next.shape[r].length; c++)
        drawBlock(
          PANEL_X + (offX + c) * BLOCK,
          56 + (offY + r) * BLOCK,
          next.shape[r][c],
        );
    drawLabel("LÍNEAS", String(lines), 230);
  };
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    if (!paused && !over) {
      dropAccum += dt * 1000;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) current.y++;
        else lockPiece();
      }
    }
    draw();
    raf = requestAnimationFrame(frame);
  };
  const reset = () => {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = BASE_DROP_MS;
    dropAccum = 0;
    next = randomPiece();
    current = randomPiece();
    callbacks.onScore(0);
    callbacks.onLevel?.(1);
  };
  window.addEventListener("keydown", onKeyDown);
  reset();
  last = performance.now();
  raf = requestAnimationFrame(frame);
  return {
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      last = performance.now();
    },
    end: endGame,
    restart() {
      over = false;
      paused = false;
      reset();
      last = performance.now();
    },
    setMuted() {}, // sin sonido
    setSkin() {}, // sin paletas todavía: tendrá su propio spec en specs/skins/
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
};
