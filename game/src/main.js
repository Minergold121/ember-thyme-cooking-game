// Ember & Thyme: boot the game, run the loop, expose state for tests.
import { GAME_H, GAME_W, mulberry32 } from './config.js';
import { createGame, tickGame } from './state.js';
import { drawGame } from './render.js';
import { bindInput } from './input.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 20261125);

let state = createGame(seed);
const canvas = document.getElementById('game');
canvas.width = GAME_W;
canvas.height = GAME_H;
const ctx = canvas.getContext('2d');
if (shotName) {
  state = applyShot(state, shotName);
  // Screenshot mode: show only the game canvas, edge to edge.
  document.body.classList.add('shot');
  document.querySelector('.wrap').style.padding = '0';
  document.querySelector('h1').style.display = 'none';
  document.querySelector('.tag').style.display = 'none';
  document.querySelector('.help').style.display = 'none';
  canvas.style.border = 'none';
  canvas.style.borderRadius = '0';
}
const getState = () => state;

function startShift() {
  state = createGame(seed + Math.floor(Math.random() * 1000));
  state.screen = 'play';
  state.message = 'Shift started! Click a ticket on the ORDER BOARD.';
  window.EMBER = { state };
}

window.EMBER = { state };
bindInput(canvas, getState, startShift);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const current = getState();
  if (current.screen === 'play' && !current.shot) {
    tickGame(current, dt, mulberry32(seed + Math.floor(current.time * 1000)));
  }
  drawGame(ctx, current);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
