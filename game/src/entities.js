// VOIDLIGHT — everything that moves: the player ship, enemies, bullets,
// pickups and particles. Plain objects + small factories; the Game owns
// the lists and the collisions, this file owns the shapes and behaviours.

import { ENEMY_TYPES, PLAYER, PALETTE } from './config.js';

let nextId = 1;

export function makePlayer(x, y) {
  return {
    id: nextId++,
    kind: 'player',
    x, y,
    vx: 0, vy: 0,
    radius: PLAYER.radius,
    angle: -Math.PI / 2,
    hull: PLAYER.hull,
    maxHull: PLAYER.hull,
    fireTimer: 0,
    invuln: 0,
    // Upgradeable stats (multipliers start at 1).
    damageMul: 1,
    fireIntervalMul: 1,
    speedMul: 1,
    magnetMul: 1,
    shots: 1,
    pierce: 0,
    regen: 0,
    novas: 1,
    overcharge: 0, // seconds left of double fire rate
    flash: 0, // white flash timer after taking a hit
  };
}

export function makeEnemy(type, x, y, wave) {
  const t = ENEMY_TYPES[type];
  // Later waves make enemies a little tougher and faster.
  const hpMul = 1 + (wave - 1) * 0.07;
  const spMul = 1 + Math.min(0.35, (wave - 1) * 0.02);
  return {
    id: nextId++,
    kind: 'enemy',
    type,
    x, y,
    vx: 0, vy: 0,
    radius: t.radius,
    speed: t.speed * spMul,
    hull: Math.round(t.hull * hpMul),
    maxHull: Math.round(t.hull * hpMul),
    damage: t.damage,
    score: t.score,
    color: t.color,
    angle: 0,
    // Behaviour timers.
    shootTimer: 1.2 + Math.random() * 1.5,
    dashTimer: 1.5 + Math.random(),
    dashing: 0,
    dashX: 0, dashY: 0,
    wobble: Math.random() * Math.PI * 2,
    spawnIn: 0.6, // portal telegraph: harmless while > 0
    flash: 0,
  };
}

// Where an enemy enters: a random point just outside one of the four edges.
export function edgeSpawnPoint(rng, width, height, margin = 30) {
  const side = Math.floor(rng() * 4);
  if (side === 0) return { x: rng() * width, y: -margin };
  if (side === 1) return { x: width + margin, y: rng() * height };
  if (side === 2) return { x: rng() * width, y: height + margin };
  return { x: -margin, y: rng() * height };
}

export function makeBullet(x, y, angle, speed, damage, pierce, friendly) {
  return {
    id: nextId++,
    kind: 'bullet',
    friendly,
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: friendly ? PLAYER.bulletRadius : 6,
    damage,
    pierce,
    life: 1.6,
    dead: false,
  };
}

export function makePickup(x, y, type) {
  return {
    id: nextId++,
    kind: 'pickup',
    type, // 'hull' | 'over' | 'nova'
    x, y,
    vx: (Math.random() - 0.5) * 40,
    vy: (Math.random() - 0.5) * 40,
    radius: 11,
    life: 12,
    bob: Math.random() * Math.PI * 2,
  };
}

export function makeParticle(x, y, opts = {}) {
  return {
    id: nextId++,
    kind: 'particle',
    x, y,
    vx: opts.vx ?? (Math.random() - 0.5) * 240,
    vy: opts.vy ?? (Math.random() - 0.5) * 240,
    radius: opts.radius ?? 2 + Math.random() * 3,
    color: opts.color ?? '#ffffff',
    life: opts.life ?? 0.5 + Math.random() * 0.4,
    maxLife: opts.life ?? 0.9,
    drag: opts.drag ?? 2.5,
    dead: false,
  };
}

export function burst(particles, x, y, color, n, speed = 260) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    particles.push(makeParticle(x, y, {
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      color,
      life: 0.4 + Math.random() * 0.5,
    }));
  }
}

export function makeFloatText(x, y, text, color) {
  return {
    id: nextId++,
    kind: 'floattext',
    x, y,
    text,
    color: color ?? PALETTE.text,
    life: 0.9,
    maxLife: 0.9,
    dead: false,
  };
}
