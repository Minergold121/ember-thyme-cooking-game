// Ember & Thyme: pure game state and rules. No DOM here, so the same
// logic runs in the browser and in headless Node play-tests.
import {
  CUSTOMERS, INGREDIENTS, MAX_HEARTS, RECIPES, SHIFT_SECONDS, pickFrom,
} from './config.js';

export function ingredientById(id) {
  return INGREDIENTS.find((item) => item.id === id);
}

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id);
}

let orderCounter = 0;

export function makeOrder(rng, elapsed) {
  const vip = rng() < 0.22;
  const customer = vip
    ? CUSTOMERS[CUSTOMERS.length - 1]
    : CUSTOMERS[Math.floor(rng() * (CUSTOMERS.length - 1))];
  const pool = RECIPES.filter((r) => (vip ? r.vipOnly : !r.vipOnly));
  const recipe = pickFrom(rng, pool);
  orderCounter += 1;
  const patience = vip ? 34 : 46 + Math.min(14, elapsed * 0.05);
  return {
    id: orderCounter,
    customer: customer.name,
    emoji: customer.emoji,
    vip: Boolean(customer.vip),
    recipeId: recipe.id,
    dish: recipe.dish,
    emojiDish: recipe.emoji,
    reward: recipe.reward,
    patience,
    patienceMax: patience,
    steps: recipe.steps.map((s) => ({ ...s })),
  };
}

export function createGame(seed) {
  const rng = () => Math.random();
  void rng;
  return {
    seed,
    screen: 'title',
    time: 0,
    shiftLeft: SHIFT_SECONDS,
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    lost: 0,
    hearts: MAX_HEARTS,
    orders: [],
    spawnIn: 1.2,
    // What the chef is carrying: null or an ingredient id, plus its prep state.
    held: null,
    heldPrepped: false,
    // The plate being assembled on the assembly counter.
    plate: { recipeId: null, done: [], ready: false },
    // Ember Heat cooking: null when idle, otherwise a sweeping needle 0..1.
    cooking: null,
    chopProgress: 0,
    chef: { x: 640, y: 470, tx: 640, ty: 470, facing: 1 },
    selectedStation: 'pantry',
    message: 'Welcome to the Sunlit Hearth! Press ENTER or click PLAY.',
    log: ['Shift starts at dawn. Madame Braise may visit.'],
    grade: null,
    muted: false,
    shot: null,
  };
}

// The chef starts a dish by fetching the first step's ingredient.
export function startPlateForOrder(state, order) {
  state.plate = { recipeId: order.recipeId, done: [], ready: false, orderId: order.id };
}

export function currentStep(state) {
  const recipe = state.plate.recipeId ? recipeById(state.plate.recipeId) : null;
  if (!recipe) return null;
  return recipe.steps[state.plate.done.length] || null;
}

export function plateComplete(state) {
  const recipe = state.plate.recipeId ? recipeById(state.plate.recipeId) : null;
  return Boolean(recipe) && state.plate.done.length >= recipe.steps.length;
}

export function pickIngredient(state, ingredientId) {
  const step = currentStep(state);
  if (!step) { state.message = 'Pick an order ticket first: click a ticket on the board.'; return false; }
  if (state.held) { state.message = 'Hands full! Use what you hold at a station first.'; return false; }
  if (step.ingredient !== ingredientId) {
    state.combo = 0;
    state.message = `Wrong ingredient: this step needs ${ingredientById(step.ingredient).name}. Combo lost.`;
    state.log.push('Wrong ingredient fetched — combo reset.');
    return false;
  }
  state.held = ingredientId;
  state.heldPrepped = false;
  state.message = `${ingredientById(ingredientId).name} in hand. Take it to: ${step.station.toUpperCase()}.`;
  return true;
}

export function useChopBoard(state) {
  const step = currentStep(state);
  if (!step || step.station !== 'chop' || !state.held || state.held !== step.ingredient) {
    state.message = 'Chop board: bring the chopped step ingredient first.';
    return false;
  }
  state.heldPrepped = true;
  state.chopProgress = 1;
  state.message = `${ingredientById(state.held).name} chopped! Now to the stove.`;
  state.log.push(`Chopped ${ingredientById(state.held).name}.`);
  return true;
}

// Ember Heat: the needle sweeps 0..1 and back. Starting the cook begins
// the sweep; stopping it in the gold zone is Perfect.
export function startCooking(state) {
  const step = currentStep(state);
  if (!step || step.station !== 'stove' || !state.held || state.held !== step.ingredient) {
    state.message = 'Stove: bring the stove step ingredient first, then light the Ember Heat.';
    return false;
  }
  state.cooking = { t: 0, dir: 1, value: 0, perfect: false };
  state.message = 'EMBER HEAT lit! Stop the needle in the GOLD zone (SPACE / click stove).';
  return true;
}

export function cookingValueAt(t) {
  // Triangle sweep, period 1.6s, so timing matters but stays fair.
  const phase = (t % 1.6) / 1.6;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

export function stopCooking(state) {
  if (!state.cooking) return null;
  const value = cookingValueAt(state.cooking.t);
  // Gold zone 0.62..0.86, warm zone 0.45..0.97, outside = burnt.
  let quality = 'burnt';
  if (value >= 0.62 && value <= 0.86) quality = 'perfect';
  else if (value >= 0.45 && value <= 0.97) quality = 'ok';
  state.cooking = null;
  if (quality === 'burnt') {
    state.held = null;
    state.heldPrepped = false;
    state.combo = 0;
    state.message = 'BURNT! The dish caught the ember. Fetch the ingredient again.';
    state.log.push('Burnt on the Ember Heat — ingredient lost.');
    return 'burnt';
  }
  state.heldPrepped = true;
  state.cookingQuality = quality;
  state.message = quality === 'perfect'
    ? 'PERFECT GOLD ZONE! Sizzle combo rising — assemble it now.'
    : 'Cooked through. Assemble it now before it cools.';
  return quality;
}

export function assembleStep(state) {
  const step = currentStep(state);
  // Assemble steps take the ingredient as-is; chop/stove steps must have
  // been prepared at their station first (heldPrepped).
  const needsPrep = step && step.station !== 'assemble';
  if (!step || !state.held || state.held !== step.ingredient || (needsPrep && !state.heldPrepped)) {
    state.message = 'Assembly: bring the prepared ingredient for the next step.';
    return false;
  }
  const quality = state.cookingQuality || 'ok';
  state.plate.done.push({ ingredient: state.held, quality });
  state.held = null;
  state.heldPrepped = false;
  state.cookingQuality = null;
  if (plateComplete(state)) {
    state.plate.ready = true;
    state.message = 'PLATE READY TO SERVE! Carry it to the SERVE window.';
    state.log.push(`${recipeById(state.plate.recipeId).dish} is plated and ready.`);
  } else {
    const next = currentStep(state);
    state.message = `Plated! Next: ${next.label}.`;
  }
  return true;
}

export function discardPlate(state) {
  state.plate = { recipeId: null, done: [], ready: false };
  state.held = null;
  state.heldPrepped = false;
  state.cooking = null;
  state.message = 'Plate cleared. Pick a fresh ticket from the order board.';
}

export function serveOrder(state, orderId) {
  if (!state.plate.ready) { state.message = 'No plate ready. Finish a dish first.'; return false; }
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) { state.message = 'That ticket is gone.'; return false; }
  if (order.recipeId !== state.plate.recipeId) {
    state.message = `Wrong dish for ${order.customer}: they ordered ${order.dish}.`;
    return false;
  }
  const perfectCount = state.plate.done.filter((d) => d.quality === 'perfect').length;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const patienceBonus = Math.round((order.patience / order.patienceMax) * 40);
  const comboBonus = (state.combo - 1) * 25;
  const perfectBonus = perfectCount * 20;
  const earned = order.reward + patienceBonus + comboBonus + perfectBonus;
  state.coins += earned;
  state.score += earned + (order.vip ? 100 : 0);
  state.served += 1;
  state.orders = state.orders.filter((o) => o.id !== orderId);
  state.message = `SERVED ${order.dish} to ${order.customer}! +${earned} coins (combo x${state.combo}).`;
  state.log.push(`Served ${order.customer}: +${earned} coins.`);
  discardPlate(state);
  state.message = `SERVED! +${earned} coins. Pick the next ticket.`;
  return true;
}

export function tickGame(state, dt, rng) {
  if (state.screen !== 'play') return;
  state.time += dt;
  state.shiftLeft = Math.max(0, state.shiftLeft - dt);
  if (state.cooking) {
    state.cooking.t += dt;
    state.cooking.value = cookingValueAt(state.cooking.t);
  }
  // Chef walks toward its target.
  const c = state.chef;
  const dx = c.tx - c.x, dy = c.ty - c.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 4) {
    const speed = 420 * dt;
    c.x += (dx / dist) * Math.min(speed, dist);
    c.y += (dy / dist) * Math.min(speed, dist);
    c.facing = dx >= 0 ? 1 : -1;
  }
  // Orders lose patience; expired orders cost a heart.
  for (const order of [...state.orders]) {
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders = state.orders.filter((o) => o.id !== order.id);
      state.hearts -= 1;
      state.combo = 0;
      state.lost += 1;
      state.message = `${order.customer} walked out! A heart is lost.`;
      state.log.push(`${order.customer} left hungry.`);
      if (state.plate.orderId === order.id) discardPlate(state);
    }
  }
  // Spawn orders, faster as the shift wears on.
  state.spawnIn -= dt;
  const maxOrders = state.time > 90 ? 4 : 3;
  if (state.spawnIn <= 0 && state.orders.length < maxOrders) {
    state.orders.push(makeOrder(rng, state.time));
    state.spawnIn = Math.max(7, 13 - state.time * 0.04);
  }
  if (state.hearts <= 0) endShift(state, 'over');
  else if (state.shiftLeft <= 0) endShift(state, 'win');
}

export function endShift(state, kind) {
  state.screen = kind === 'win' ? 'win' : 'over';
  const target = 1200;
  state.grade = state.score >= target * 1.5 ? 'S'
    : state.score >= target ? 'A'
    : state.score >= target * 0.6 ? 'B' : 'C';
  state.message = kind === 'win'
    ? `Shift complete! Grade ${state.grade}.`
    : 'The hearth went cold — too many guests walked out.';
}
