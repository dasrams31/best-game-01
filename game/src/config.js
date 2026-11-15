// VOIDLIGHT — tuning constants and palette.
// One place for every number the game balances on, so tuning never
// means hunting through the update code.

export const VIEW = { width: 960, height: 600 };

export const PALETTE = {
  spaceTop: '#0a1030',
  spaceBottom: '#04050f',
  nebulaCyan: 'rgba(64, 180, 255, 0.10)',
  nebulaMagenta: 'rgba(255, 95, 208, 0.08)',
  nebulaAmber: 'rgba(255, 200, 95, 0.06)',
  grid: 'rgba(120, 160, 255, 0.05)',
  player: '#5ff2ff',
  playerCore: '#eafcff',
  bullet: '#bff6ff',
  mote: '#ff5f6e',
  darter: '#ffb347',
  spitter: '#c77dff',
  splitter: '#7dff9a',
  hulk: '#ff8fa3',
  pickupHull: '#7dff9a',
  pickupOver: '#ffc85f',
  pickupNova: '#5ff2ff',
  text: '#e8f2ff',
  textDim: '#8fa3c8',
  card: '#101a3a',
  cardEdge: '#2c4a8f',
  danger: '#ff5f6e',
};

export const PLAYER = {
  radius: 14,
  speed: 265,
  hull: 100,
  fireInterval: 0.16,
  bulletSpeed: 560,
  bulletDamage: 12,
  bulletRadius: 4,
  invulnAfterHit: 0.9,
  magnetRadius: 90,
};

export const ENEMY_TYPES = {
  mote:     { radius: 13, speed: 95,  hull: 18,  damage: 10, score: 50,  cost: 1, color: PALETTE.mote },
  darter:   { radius: 11, speed: 70,  hull: 14,  damage: 12, score: 80,  cost: 2, color: PALETTE.darter },
  spitter:  { radius: 16, speed: 55,  hull: 30,  damage: 8,  score: 120, cost: 3, color: PALETTE.spitter },
  splitter: { radius: 18, speed: 65,  hull: 34,  damage: 10, score: 100, cost: 3, color: PALETTE.splitter },
  hulk:     { radius: 30, speed: 38,  hull: 140, damage: 22, score: 300, cost: 6, color: PALETTE.hulk },
};

export const WAVES = {
  // Spawn budget grows with the wave; each enemy type costs points.
  budget: (wave) => 6 + wave * 4,
  // Seconds between spawn ticks; shrinks as waves climb, to a floor.
  spawnInterval: (wave) => Math.max(0.35, 1.15 - wave * 0.06),
  // How many enemies may be alive at once.
  maxAlive: (wave) => Math.min(10 + wave * 2, 34),
  // Which types may appear at this wave.
  unlocked: (wave) => {
    const list = ['mote'];
    if (wave >= 2) list.push('darter');
    if (wave >= 3) list.push('spitter');
    if (wave >= 4) list.push('splitter');
    if (wave >= 6) list.push('hulk');
    return list;
  },
};

export const COMBO = {
  windowSec: 3.0,
  // Multiplier steps: every 10 combo adds +0.5x, capped at 3x.
  stepEvery: 10,
  stepBonus: 0.5,
  maxMultiplier: 3,
};

export const UPGRADES = [
  { id: 'damage',   name: 'Bright Core',   desc: '+25% bullet damage',        apply: (p) => { p.damageMul *= 1.25; } },
  { id: 'firerate', name: 'Rapid Lantern', desc: '+20% fire rate',            apply: (p) => { p.fireIntervalMul *= 0.8; } },
  { id: 'multishot',name: 'Twin Flames',   desc: '+1 bullet per shot',        apply: (p) => { p.shots += 1; } },
  { id: 'speed',    name: 'Swift Drift',   desc: '+12% move speed',           apply: (p) => { p.speedMul *= 1.12; } },
  { id: 'hull',     name: 'Reinforced Hull', desc: '+25 max hull, repair 25', apply: (p) => { p.maxHull += 25; p.hull = Math.min(p.maxHull, p.hull + 25); } },
  { id: 'pierce',   name: 'Piercing Light',desc: 'Bullets pierce +1 enemy',   apply: (p) => { p.pierce += 1; } },
  { id: 'magnet',   name: 'Star Magnet',   desc: '+70% pickup radius',        apply: (p) => { p.magnetMul *= 1.7; } },
  { id: 'nova',     name: 'Nova Charge',   desc: '+1 nova bomb (press E)',    apply: (p) => { p.novas += 1; } },
  { id: 'regen',    name: 'Ember Heart',   desc: 'Regenerate 1 hull / sec',   apply: (p) => { p.regen += 1; } },
];

export const NOVA = {
  damage: 120,
  radius: 9999, // hits everything on screen
  startStock: 1,
};

export const DROPS = {
  hullChance: 0.10,
  overChance: 0.06,
  novaChance: 0.03,
  hullHeal: 20,
  overDuration: 6,
};
