// Ember & Thyme: canvas rendering. Every screen is drawn from state,
// so the screenshots are real renders of the game itself.
import { GAME_H, GAME_W, INGREDIENTS } from './config.js';
import { currentStep, ingredientById, recipeById } from './state.js';

export const STATIONS = [
  { id: 'pantry', label: 'PANTRY', sub: 'Ingredients', x: 350, y: 192, w: 250, h: 108, emoji: '🧺' },
  { id: 'chop', label: 'CHOP BOARD', sub: 'Click / C', x: 630, y: 192, w: 250, h: 108, emoji: '🔪' },
  { id: 'stove', label: 'STOVE · EMBER HEAT', sub: 'Click / SPACE', x: 910, y: 192, w: 330, h: 108, emoji: '🔥' },
  { id: 'assemble', label: 'ASSEMBLY COUNTER', sub: 'Build the dish', x: 350, y: 322, w: 420, h: 130, emoji: '🍽️' },
  { id: 'serve', label: 'SERVE WINDOW', sub: 'Plate ready → serve', x: 800, y: 322, w: 440, h: 130, emoji: '🛎️' },
];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, fill, stroke) {
  ctx.fillStyle = fill;
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function bar(ctx, x, y, w, h, frac, fill, back = '#e9e2d5') {
  ctx.fillStyle = back;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    ctx.fillStyle = fill;
    rr(ctx, x, y, Math.max(h, w * f), h, h / 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#8a7a5c';
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, h / 2);
  ctx.stroke();
}

export function drawGame(ctx, state) {
  ctx.clearRect(0, 0, GAME_W, GAME_H);
  // Sunlit kitchen wall + tiled floor.
  ctx.fillStyle = '#fdf3d8';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(0, 0, GAME_W, 118);
  ctx.fillStyle = '#fff8e1';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillRect(60 + i * 250, 18, 180, 84);
    ctx.strokeStyle = '#e8c97a';
    ctx.lineWidth = 4;
    ctx.strokeRect(60 + i * 250, 18, 180, 84);
  }
  text(ctx, '☀️ SUNLIT HEARTH KITCHEN', 640, 66, 30, '#7a5a12', 'center');
  ctx.fillStyle = '#e8d3a8';
  for (let y = 470; y < GAME_H; y += 52) {
    for (let x = (y % 104 === 0 ? 0 : -52); x < GAME_W; x += 104) {
      ctx.fillRect(x, y, 100, 48);
    }
  }
  ctx.fillStyle = '#d9c08a';
  ctx.fillRect(0, 466, GAME_W, 6);

  if (state.screen === 'title') { drawTitle(ctx, state); drawHud(ctx, state); return; }
  if (state.screen === 'win' || state.screen === 'over') { drawEnd(ctx, state); drawHud(ctx, state); return; }

  drawOrderBoard(ctx, state);
  drawStations(ctx, state);
  drawChef(ctx, state);
  drawHud(ctx, state);
  drawBottomBar(ctx, state);
}

function drawHud(ctx, state) {
  // Top HUD strip drawn over the wall.
  ctx.fillStyle = 'rgba(60,38,8,0.92)';
  rr(ctx, 12, 124, GAME_W - 24, 52, 12);
  ctx.fill();
  text(ctx, 'EMBER & THYME', 28, 158, 24, '#ffd97a');
  const mins = Math.floor(state.shiftLeft / 60);
  const secs = Math.floor(state.shiftLeft % 60);
  const timerColor = state.shiftLeft < 30 ? '#ff6b6b' : '#ffffff';
  text(ctx, `⏱ SHIFT ${mins}:${String(secs).padStart(2, '0')}`, 250, 158, 24, timerColor);
  bar(ctx, 430, 136, 170, 26, state.shiftLeft / 150, state.shiftLeft < 30 ? '#ff6b6b' : '#51cf66');
  text(ctx, `SCORE ${state.score}`, 620, 158, 24, '#ffffff');
  text(ctx, `🪙 ${state.coins}`, 790, 158, 24, '#ffd97a');
  text(ctx, `🔥 COMBO x${state.combo}`, 920, 158, 24, state.combo >= 3 ? '#ffb347' : '#ffffff');
  text(ctx, `❤️`.repeat(Math.max(0, state.hearts)) + `🖤`.repeat(Math.max(0, 3 - state.hearts)), 1108, 158, 22, '#ffffff');
}

function trunc(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

function drawOrderBoard(ctx, state) {
  panel(ctx, 16, 186, 312, 340, '#fffdf5', '#8a7a5c');
  ctx.fillStyle = '#7a3b00';
  rr(ctx, 16, 186, 312, 40, 12);
  ctx.fill();
  text(ctx, '📋 ORDER BOARD', 30, 214, 21, '#ffffff');
  text(ctx, `${state.orders.length}/4`, 300, 214, 16, '#ffe9a8', 'right');
  if (state.orders.length === 0) {
    text(ctx, 'No tickets yet…', 32, 262, 18, '#8a7a5c');
    text(ctx, 'Guests arrive soon.', 32, 288, 18, '#8a7a5c');
  }
  state.orders.forEach((order, i) => {
    const y = 234 + i * 68;
    const active = state.plate.orderId === order.id;
    ctx.fillStyle = order.vip ? '#fff3bf' : '#ffffff';
    rr(ctx, 26, y, 292, 62, 10);
    ctx.fill();
    ctx.lineWidth = active ? 4 : 2;
    ctx.strokeStyle = active ? '#e8590c' : '#c9b995';
    ctx.stroke();
    text(ctx, `${order.emoji} ${trunc(order.customer, 18)}${order.vip ? ' ★VIP' : ''}`, 36, y + 21, 16, '#3b2a10');
    text(ctx, `🪙${order.reward}`, 306, y + 21, 15, '#8a6d00', 'right');
    text(ctx, `${order.emojiDish} ${trunc(order.dish, 26)}`, 36, y + 42, 15, '#7a3b00');
    text(ctx, `${Math.ceil(order.patience)}s`, 306, y + 42, 13, '#8a7a5c', 'right');
    const frac = order.patience / order.patienceMax;
    bar(ctx, 36, y + 48, 272, 8, frac, frac > 0.5 ? '#51cf66' : frac > 0.25 ? '#ffa94d' : '#ff6b6b');
  });
  text(ctx, 'Click a ticket to start its dish.', 32, 516, 14, '#8a7a5c');
}

function drawStations(ctx, state) {
  for (const st of STATIONS) {
    const selected = state.selectedStation === st.id;
    const isServe = st.id === 'serve';
    const readyGlow = isServe && state.plate.ready;
    if (readyGlow) {
      ctx.fillStyle = 'rgba(255, 200, 60, 0.45)';
      rr(ctx, st.x - 8, st.y - 8, st.w + 16, st.h + 16, 18);
      ctx.fill();
    }
    panel(ctx, st.x, st.y, st.w, st.h, readyGlow ? '#fff9db' : '#fffdf5', selected ? '#e8590c' : '#8a7a5c');
    text(ctx, `${st.emoji} ${st.label}`, st.x + 16, st.y + 32, 21, '#3b2a10');
    text(ctx, st.sub, st.x + 16, st.y + 56, 15, '#8a7a5c');
    if (st.id === 'pantry') drawPantry(ctx, state, st);
    if (st.id === 'chop') drawChop(ctx, state, st);
    if (st.id === 'stove') drawStove(ctx, state, st);
    if (st.id === 'assemble') drawAssembly(ctx, state, st);
    if (st.id === 'serve') drawServe(ctx, state, st);
  }
}

function drawPantry(ctx, state, st) {
  // Ingredients on the counter: six labelled chips.
  INGREDIENTS.forEach((ing, i) => {
    const cx = st.x + 14 + i * 39;
    ctx.fillStyle = '#fff3d6';
    rr(ctx, cx, st.y + 64, 34, 36, 8);
    ctx.fill();
    ctx.strokeStyle = '#c9b995';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, ing.emoji, cx + 17, st.y + 90, 20, '#000000', 'center');
  });
}

function drawChop(ctx, state, st) {
  const held = state.held ? ingredientById(state.held) : null;
  text(ctx, held ? `${held.emoji} ${held.name}${state.heldPrepped ? ' ✓ chopped' : ' — chop it!'}` : 'Empty board', st.x + 16, st.y + 86, 17, held ? '#2f9e44' : '#8a7a5c');
}

function drawStove(ctx, state, st) {
  // Ember Heat gauge: needle over red / warm / GOLD zones.
  const gx = st.x + 16, gy = st.y + 66, gw = st.w - 32;
  ctx.fillStyle = '#ffd8a8';
  rr(ctx, gx, gy, gw, 18, 9);
  ctx.fill();
  ctx.fillStyle = '#ffa94d';
  ctx.fillRect(gx + gw * 0.45, gy, gw * 0.52, 18);
  ctx.fillStyle = '#ffd43b';
  ctx.fillRect(gx + gw * 0.62, gy, gw * 0.24, 18);
  ctx.strokeStyle = '#8a7a5c';
  ctx.lineWidth = 2;
  rr(ctx, gx, gy, gw, 18, 9);
  ctx.stroke();
  text(ctx, 'GOLD', gx + gw * 0.74, gy - 6, 12, '#8a6d00', 'center');
  const value = state.cooking ? state.cooking.value : 0;
  const nx = gx + gw * value;
  ctx.fillStyle = '#e03131';
  ctx.beginPath();
  ctx.moveTo(nx, gy - 6);
  ctx.lineTo(nx - 7, gy - 18);
  ctx.lineTo(nx + 7, gy - 18);
  ctx.closePath();
  ctx.fill();
  text(ctx, state.cooking ? '🔥 EMBER HEAT LIVE — stop in gold!' : '🔥 EMBER HEAT: gold zone = perfect', st.x + 16, st.y + 104, 14, state.cooking ? '#e03131' : '#8a7a5c');
}

function drawAssembly(ctx, state, st) {
  const recipe = state.plate.recipeId ? recipeById(state.plate.recipeId) : null;
  if (!recipe) {
    text(ctx, 'No dish started — pick a ticket.', st.x + 16, st.y + 86, 16, '#8a7a5c');
    text(ctx, 'Plate appears here mid-assembly.', st.x + 16, st.y + 108, 14, '#8a7a5c');
    return;
  }
  text(ctx, `🍽️ ${recipe.dish}${state.plate.ready ? ' — READY!' : ' — MID-ASSEMBLY'}`, st.x + 16, st.y + 86, 16, '#3b2a10');
  // The plate, with one slot per step: filled slots show the ingredient.
  recipe.steps.forEach((step, i) => {
    const done = state.plate.done[i];
    const px = st.x + 16 + i * 62;
    ctx.fillStyle = done ? '#e7f6e7' : '#f1ead9';
    ctx.beginPath();
    ctx.ellipse(px + 26, st.y + 110, 26, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = done ? '#2f9e44' : '#c9b995';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (done) text(ctx, ingredientById(done.ingredient).emoji, px + 26, st.y + 116, 18, '#000000', 'center');
    else text(ctx, ingredientById(step.ingredient).emoji, px + 26, st.y + 116, 18, '#b9ac8f', 'center');
  });
}

function drawServe(ctx, state, st) {
  if (state.plate.ready) {
    const recipe = recipeById(state.plate.recipeId);
    text(ctx, `🍽️ ${recipe.dish}`, st.x + 16, st.y + 86, 20, '#2f9e44');
    text(ctx, 'PLATE READY TO SERVE — click a matching ticket!', st.x + 16, st.y + 108, 15, '#2f9e44');
  } else {
    text(ctx, 'Waiting for a finished plate…', st.x + 16, st.y + 86, 16, '#8a7a5c');
    text(ctx, 'Serve window: ring the bell 🛎️', st.x + 16, st.y + 108, 14, '#8a7a5c');
  }
}

function drawChef(ctx, state) {
  const c = state.chef;
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 26, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Chef: white hat, apron, holding tray item overhead when carrying.
  ctx.fillStyle = '#ffffff';
  rr(ctx, c.x - 16, c.y - 8, 32, 30, 10);
  ctx.fill();
  ctx.strokeStyle = '#8a7a5c';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fffdf5';
  rr(ctx, c.x - 18, c.y - 30, 36, 22, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3b2a10';
  ctx.beginPath();
  ctx.arc(c.x, c.y + 4, 9, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, '👨‍🍳', c.x, c.y - 34, 26, '#000000', 'center');
  if (state.held) {
    text(ctx, ingredientById(state.held).emoji, c.x + 30 * c.facing, c.y - 22, 26, '#000000', 'center');
  }
  text(ctx, 'YOU', c.x, c.y + 46, 13, '#7a3b00', 'center');
}

function drawBottomBar(ctx, state) {
  panel(ctx, 16, 620, 824, 84, 'rgba(255,253,245,0.96)', '#8a7a5c');
  const step = currentStep(state);
  text(ctx, 'NEXT STEP', 30, 646, 14, '#8a6d00');
  text(ctx, step ? step.label : 'Pick a ticket on the order board', 30, 672, 19, '#3b2a10');
  text(ctx, state.message, 30, 694, 15, '#7a3b00');
  panel(ctx, 856, 620, 408, 84, '#fff3d6', '#8a7a5c');
  text(ctx, 'KEYS  WASD move · E act · TAB next station', 872, 646, 14, '#3b2a10');
  text(ctx, '1–6 pantry · C chop · K heat · SPACE stop · X discard', 872, 668, 14, '#3b2a10');
  text(ctx, 'Click stations, chips & tickets · M mute · R restart', 872, 690, 13, '#8a7a5c');
}

function drawTitle(ctx, state) {
  panel(ctx, 290, 210, 700, 330, 'rgba(255,253,245,0.97)', '#8a7a5c');
  text(ctx, '🔥 EMBER & THYME 🔥', 640, 280, 44, '#7a3b00', 'center');
  text(ctx, 'Sizzle at the Sunlit Hearth', 640, 318, 24, '#b8860b', 'center');
  text(ctx, 'Cook every ticket before patience runs out.', 640, 356, 19, '#3b2a10', 'center');
  text(ctx, 'Master the EMBER HEAT: stop the needle in the GOLD zone', 640, 384, 19, '#3b2a10', 'center');
  text(ctx, 'for Perfect dishes — and impress MADAME BRAISE, the VIP.', 640, 410, 19, '#3b2a10', 'center');
  ctx.fillStyle = '#e8590c';
  rr(ctx, 490, 436, 300, 56, 14);
  ctx.fill();
  text(ctx, '▶  PLAY  (ENTER)', 640, 473, 26, '#ffffff', 'center');
  text(ctx, 'Keyboard + mouse · no network · original game', 640, 516, 14, '#8a7a5c', 'center');
  void state;
}

function drawEnd(ctx, state) {
  const win = state.screen === 'win';
  panel(ctx, 290, 200, 700, 340, 'rgba(255,253,245,0.97)', '#8a7a5c');
  text(ctx, win ? '🌅 SHIFT COMPLETE!' : '🥀 THE HEARTH WENT COLD', 640, 268, 36, win ? '#2f9e44' : '#c92a2a', 'center');
  text(ctx, `GRADE ${state.grade}  ·  Score ${state.score}  ·  Coins 🪙 ${state.coins}`, 640, 316, 24, '#3b2a10', 'center');
  text(ctx, `Served ${state.served} guests · Best combo x${state.bestCombo} · Walked out ${state.lost}`, 640, 350, 19, '#3b2a10', 'center');
  text(ctx, win ? 'The Sunlit Hearth glows. Madame Braise approves!' : 'Too many guests walked out hungry.', 640, 384, 19, '#7a3b00', 'center');
  ctx.fillStyle = '#e8590c';
  rr(ctx, 490, 416, 300, 56, 14);
  ctx.fill();
  text(ctx, '↻  PLAY AGAIN  (R)', 640, 453, 24, '#ffffff', 'center');
  text(ctx, 'Target 1200 for Grade A · 1800 for Grade S', 640, 510, 14, '#8a7a5c', 'center');
}
