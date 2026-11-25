// Ember & Thyme: keyboard + mouse input. Clicking a station walks the
// chef there and acts; keys act directly. All actions go through the
// pure rules in state.js.
import { INGREDIENTS } from './config.js';
import {
  assembleStep, createGame, discardPlate, pickIngredient, serveOrder,
  startCooking, startPlateForOrder, stopCooking, useChopBoard,
} from './state.js';
import { STATIONS } from './render.js';
import { sfx } from './audio.js';

export function stationAt(x, y) {
  return STATIONS.find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) || null;
}

export function orderAt(state, x, y) {
  if (x < 26 || x > 318 || y < 234) return null;
  const i = Math.floor((y - 234) / 68);
  return state.orders[i] || null;
}

export function pantryChipAt(x, y) {
  if (y < 254 || y > 294) return null;
  const i = Math.floor((x - 364) / 39);
  return INGREDIENTS[i] || null;
}

export function actOnStation(state, stationId) {
  state.selectedStation = stationId;
  const station = STATIONS.find((s) => s.id === stationId);
  if (station) {
    state.chef.tx = station.x + station.w / 2;
    state.chef.ty = station.y + station.h + 42;
  }
  if (stationId === 'chop') {
    if (useChopBoard(state)) sfx.chop(state.muted);
    else sfx.bad(state.muted);
  } else if (stationId === 'stove') {
    if (state.cooking) {
      const q = stopCooking(state);
      if (q === 'perfect') sfx.perfect(state.muted);
      else if (q === 'burnt') sfx.bad(state.muted);
      else sfx.sizzle(state.muted);
    } else if (startCooking(state)) {
      sfx.sizzle(state.muted);
    } else sfx.bad(state.muted);
  } else if (stationId === 'assemble') {
    if (assembleStep(state)) sfx.pick(state.muted);
    else sfx.bad(state.muted);
  } else if (stationId === 'serve') {
    const order = state.orders.find((o) => o.id === state.plate.orderId);
    if (order && serveOrder(state, order.id)) sfx.serve(state.muted);
    else { state.message = 'Serve window: finish a plate, then click its ticket.'; sfx.bad(state.muted); }
  }
}

export function clickTicket(state, order) {
  if (state.plate.recipeId && state.plate.orderId !== order.id && state.plate.done.length > 0) {
    state.message = 'A dish is already mid-assembly. Finish or discard it (X) first.';
    sfx.bad(state.muted);
    return;
  }
  startPlateForOrder(state, order);
  state.message = `Ticket: ${order.dish} for ${order.customer}. Fetch: ${order.steps[0].label}.`;
  sfx.pick(state.muted);
}

export function bindInput(canvas, getState, onRestart) {
  function toGameCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  canvas.addEventListener('click', (event) => {
    const state = getState();
    const { x, y } = toGameCoords(event);
    if (state.screen === 'title') {
      if (x >= 490 && x <= 790 && y >= 436 && y <= 492) onRestart();
      return;
    }
    if (state.screen === 'win' || state.screen === 'over') {
      if (x >= 490 && x <= 790 && y >= 416 && y <= 472) onRestart();
      return;
    }
    const order = orderAt(state, x, y);
    if (order) { clickTicket(state, order); return; }
    const station = stationAt(x, y);
    if (station) {
      if (station.id === 'pantry') {
        const chip = pantryChipAt(x, y);
        if (chip) {
          if (pickIngredient(state, chip.id)) sfx.pick(state.muted);
          else sfx.bad(state.muted);
        } else {
          state.message = 'Pantry: click an ingredient chip (or press 1–6).';
        }
        state.selectedStation = 'pantry';
        return;
      }
      actOnStation(state, station.id);
    }
  });

  document.addEventListener('keydown', (event) => {
    const state = getState();
    const key = event.key.toLowerCase();
    if (key === 'm') { state.muted = !state.muted; state.message = state.muted ? 'Sound off.' : 'Sound on.'; return; }
    if (key === 'r') { onRestart(); return; }
    if (state.screen === 'title' && (key === 'enter' || key === ' ')) { onRestart(); return; }
    if ((state.screen === 'win' || state.screen === 'over') && key === 'enter') { onRestart(); return; }
    if (state.screen !== 'play') return;
    const chef = state.chef;
    if (key === 'arrowup' || key === 'w') { chef.ty = Math.max(190, chef.ty - 46); event.preventDefault(); }
    if (key === 'arrowdown' || key === 's') { chef.ty = Math.min(610, chef.ty + 46); event.preventDefault(); }
    if (key === 'arrowleft' || key === 'a') { chef.tx = Math.max(40, chef.tx - 46); event.preventDefault(); }
    if (key === 'arrowright' || key === 'd') { chef.tx = Math.min(1240, chef.tx + 46); event.preventDefault(); }
    if (key >= '1' && key <= '6') {
      const ing = INGREDIENTS[Number(key) - 1];
      if (ing && pickIngredient(state, ing.id)) sfx.pick(state.muted);
      return;
    }
    if (key === 'c') { actOnStation(state, 'chop'); }
    if (key === 'e') { actOnStation(state, state.selectedStation); }
    if (key === ' ') {
      event.preventDefault();
      if (state.cooking) actOnStation(state, 'stove');
      else actOnStation(state, state.selectedStation);
    }
    if (key === 'k') { actOnStation(state, 'stove'); }
    if (key === 'x') { discardPlate(state); }
    if (key === 'tab') {
      event.preventDefault();
      const ids = STATIONS.map((s) => s.id);
      const next = ids[(ids.indexOf(state.selectedStation) + 1) % ids.length];
      state.selectedStation = next;
    }
  });
}
