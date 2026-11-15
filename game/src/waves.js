// VOIDLIGHT — wave composition: how many of each enemy a wave throws,
// and the spawn queue the Game drains over the wave.

import { WAVES, ENEMY_TYPES } from './config.js';
import { shuffle } from './rng.js';

// Build the spawn queue for a wave: a shuffled list of enemy type names
// whose total cost fits the wave's budget. Later waves unlock new types
// and bias toward the nastier ones.
export function buildWaveQueue(wave, rng) {
  const unlocked = WAVES.unlocked(wave);
  const budget = WAVES.budget(wave);
  const queue = [];
  let spent = 0;
  // Weight: cheap types stay common, expensive types appear once unlocked.
  const weights = { mote: 5, darter: 4, spitter: 3, splitter: 3, hulk: 2 };
  let guard = 0;
  while (spent < budget && guard < 200) {
    guard++;
    // Pick a type by weight among the unlocked ones.
    let total = 0;
    for (const t of unlocked) total += weights[t];
    let roll = rng() * total;
    let type = 'mote';
    for (const t of unlocked) {
      roll -= weights[t];
      if (roll <= 0) { type = t; break; }
    }
    const cost = ENEMY_TYPES[type].cost;
    if (spent + cost > budget + 2) continue;
    queue.push(type);
    spent += cost;
  }
  return shuffle(rng, queue);
}

// Wave clear bonus: a flat reward that grows with the wave.
export function waveClearBonus(wave) {
  return 100 * wave;
}
