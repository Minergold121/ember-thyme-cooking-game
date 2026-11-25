// Ember & Thyme: staged scenes for the screenshots (?shot=cover etc).
// Each scene is a deterministic game state built through the real rules,
// so every screenshot is a real render of the game's own code.
import { mulberry32 } from './config.js';
import {
  assembleStep, createGame, makeOrder, pickIngredient, startPlateForOrder, stopCooking, startCooking, useChopBoard,
} from './state.js';

function forceOrder(state, rng, index) {
  const order = makeOrder(rng, 30);
  order.id = 100 + index;
  order.patience = order.patienceMax * (0.45 + index * 0.12);
  return order;
}

function buildBusyKitchen(state) {
  const rng = mulberry32(20261125);
  state.screen = 'play';
  state.score = 1240;
  state.coins = 486;
  state.combo = 3;
  state.bestCombo = 4;
  state.served = 5;
  state.shiftLeft = 87;
  state.orders = [forceOrder(state, rng, 0), forceOrder(state, rng, 1), forceOrder(state, rng, 2), forceOrder(state, rng, 3)];
  // Madame Braise headlines the board.
  state.orders[0].customer = 'MADAME BRAISE';
  state.orders[0].emoji = '👑';
  state.orders[0].vip = true;
  state.orders[0].dish = "Madame's Braise Feast";
  state.orders[0].recipeId = 'braise-feast';
  // Start Madame's dish and assemble two of its four steps: mid-assembly.
  // Each step is fetched, prepared at its station, then assembled.
  startPlateForOrder(state, state.orders[0]);
  pickIngredient(state, 'chicken');
  useChopBoard(state);
  assembleStep(state);
  pickIngredient(state, 'chicken');
  startCooking(state);
  state.cooking.t = 0.95; // needle inside the gold zone
  stopCooking(state);
  assembleStep(state);
  // Chef stands at the stove, Ember Heat needle live in the gold zone,
  // two of four plate slots filled: a dish mid-assembly.
  state.cooking = { t: 0.95, dir: 1, value: 0.81, perfect: false };
  state.chef.x = 640; state.chef.y = 548; state.chef.tx = 640; state.chef.ty = 548;
  state.message = 'EMBER HEAT in the GOLD zone! Assemble the feast for MADAME BRAISE.';
  return state;
}

function buildReadyPlate(state) {
  const rng = mulberry32(77);
  state.screen = 'play';
  state.score = 980;
  state.coins = 350;
  state.combo = 2;
  state.shiftLeft = 64;
  state.orders = [forceOrder(state, rng, 0), forceOrder(state, rng, 1)];
  state.orders[0].recipeId = 'ember-soup';
  state.orders[0].dish = 'Ember Tomato Soup';
  startPlateForOrder(state, state.orders[0]);
  pickIngredient(state, 'tomato');
  useChopBoard(state);
  assembleStep(state);
  pickIngredient(state, 'tomato');
  startCooking(state);
  state.cooking.t = 0.95;
  stopCooking(state);
  assembleStep(state);
  pickIngredient(state, 'herb');
  assembleStep(state);
  state.chef.x = 1020; state.chef.y = 498; state.chef.tx = 1020; state.chef.ty = 498;
  state.message = 'PLATE READY TO SERVE! Ring the bell at the SERVE window.';
  return state;
}

export function applyShot(state, shot) {
  state.shot = shot;
  if (shot === 'title') {
    const fresh = createGame(state.seed);
    fresh.screen = 'title';
    return fresh;
  }
  if (shot === 'cover') return buildBusyKitchen(state);
  if (shot === 'ready') return buildReadyPlate(state);
  if (shot === 'win') {
    const fresh = createGame(state.seed);
    fresh.screen = 'win';
    fresh.score = 1890;
    fresh.coins = 720;
    fresh.served = 14;
    fresh.bestCombo = 6;
    fresh.grade = 'S';
    fresh.shiftLeft = 0;
    return fresh;
  }
  if (shot === 'over') {
    const fresh = createGame(state.seed);
    fresh.screen = 'over';
    fresh.score = 420;
    fresh.coins = 180;
    fresh.served = 3;
    fresh.lost = 3;
    fresh.hearts = 0;
    fresh.grade = 'C';
    return fresh;
  }
  return state;
}
