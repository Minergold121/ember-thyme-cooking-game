// Ember & Thyme: shared tuning, names and seeded randomness.
export const GAME_W = 1280;
export const GAME_H = 720;
export const SHIFT_SECONDS = 150;
export const WIN_SCORE = 1200;
export const MAX_HEARTS = 3;

export const INGREDIENTS = [
  { id: 'tomato', name: 'Tomato', emoji: '🍅', color: '#e5484d' },
  { id: 'chicken', name: 'Chicken', emoji: '🍗', color: '#d97706' },
  { id: 'herb', name: 'Thyme Herb', emoji: '🌿', color: '#2f9e44' },
  { id: 'bread', name: 'Hearth Bread', emoji: '🍞', color: '#b7791f' },
  { id: 'fish', name: 'River Fish', emoji: '🐟', color: '#1971c2' },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄', color: '#9775fa' },
];

export const CUSTOMERS = [
  { name: 'Pip the Runner', emoji: '🏃' },
  { name: 'Rosa', emoji: '🌹' },
  { name: 'Old Tomas', emoji: '🧔' },
  { name: 'Little Ana', emoji: '🎀' },
  { name: 'MADAME BRAISE', emoji: '👑', vip: true },
];

// A recipe is a dish: a list of assembly steps. Each step names the
// ingredient to fetch and the station that prepares it.
export const RECIPES = [
  {
    id: 'ember-soup',
    dish: 'Ember Tomato Soup',
    emoji: '🍲',
    reward: 120,
    steps: [
      { ingredient: 'tomato', station: 'chop', label: 'Chop tomato' },
      { ingredient: 'tomato', station: 'stove', label: 'Simmer on Ember Heat' },
      { ingredient: 'herb', station: 'assemble', label: 'Garnish with thyme' },
    ],
  },
  {
    id: 'thyme-chicken',
    dish: 'Thyme Chicken Plate',
    emoji: '🍽️',
    reward: 160,
    steps: [
      { ingredient: 'chicken', station: 'chop', label: 'Trim chicken' },
      { ingredient: 'chicken', station: 'stove', label: 'Sear on Ember Heat' },
      { ingredient: 'bread', station: 'assemble', label: 'Add hearth bread' },
    ],
  },
  {
    id: 'river-fish',
    dish: 'Golden River Fish',
    emoji: '🐟',
    reward: 150,
    steps: [
      { ingredient: 'fish', station: 'chop', label: 'Fillet fish' },
      { ingredient: 'fish', station: 'stove', label: 'Fry on Ember Heat' },
      { ingredient: 'herb', station: 'assemble', label: 'Finish with thyme' },
    ],
  },
  {
    id: 'forest-bowl',
    dish: 'Forest Mushroom Bowl',
    emoji: '🥣',
    reward: 130,
    steps: [
      { ingredient: 'mushroom', station: 'chop', label: 'Slice mushroom' },
      { ingredient: 'mushroom', station: 'stove', label: 'Saute on Ember Heat' },
      { ingredient: 'bread', station: 'assemble', label: 'Serve with bread' },
    ],
  },
  {
    id: 'braise-feast',
    dish: "Madame's Braise Feast",
    emoji: '👑',
    reward: 260,
    vipOnly: true,
    steps: [
      { ingredient: 'chicken', station: 'chop', label: 'Trim chicken' },
      { ingredient: 'chicken', station: 'stove', label: 'Braise on Ember Heat' },
      { ingredient: 'tomato', station: 'assemble', label: 'Crown with tomato' },
      { ingredient: 'herb', station: 'assemble', label: 'Finish with thyme' },
    ],
  },
];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
