// VOIDLIGHT — the game itself: state machine, loop, physics, collisions,
// waves, upgrades and the demo scenes the screenshots are taken from.
// The renderer draws; this file decides what happens.

import { VIEW, PLAYER, ENEMY_TYPES, WAVES, COMBO, UPGRADES, NOVA, DROPS, PALETTE } from './config.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { Renderer } from './render.js';
import { makePlayer, makeEnemy, edgeSpawnPoint, makeBullet, makePickup, makeParticle, burst, makeFloatText } from './entities.js';
import { buildWaveQueue, waveClearBonus } from './waves.js';
import { makeRng, shuffle } from './rng.js';

const BEST_KEY = 'voidlight.best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sfx = new Sfx();
    this.renderer = new Renderer(canvas);
    this.state = 'title';
    this.time = 0;
    this.last = 0;
    this.best = 0;
    try { this.best = Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch { this.best = 0; }
    this.resetRun();
    this.startButton = null;
    this.restartButton = null;
    this.upgradeCards = [];
    this.upgradeChoices = [];
    this.bannerText = '';
    this.bannerSub = '';
    this.bannerTimer = 0;
    this.shakeTime = 0;
    this.shakeMag = 0;
    this.rng = Math.random;
    this.applyShotMode();
  }

  resetRun() {
    this.player = makePlayer(VIEW.width / 2, VIEW.height / 2);
    this.player.aimX = VIEW.width / 2;
    this.player.aimY = VIEW.height / 2 - 100;
    this.enemies = [];
    this.bullets = [];
    this.pickups = [];
    this.particles = [];
    this.floatTexts = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.wavesCleared = 0;
    this.lastWaveBonus = 0;
    this.multiplier = 1;
  }

  // ?shot=start|play|upgrade|end&seed=N — deterministic demo scenes for
  // the screenshots. Real renders of the game's own code, no special build.
  applyShotMode() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (!shot) return;
    const seed = Number(params.get('seed') || 7);
    const rng = makeRng(seed);
    this.rng = rng;
    if (shot === 'start') {
      this.state = 'title';
    } else if (shot === 'play') {
      this.startWave(3, rng);
      this.state = 'playing';
      this.score = 2450;
      this.combo = 12;
      this.multiplier = 1.5;
      this.player.x = 470;
      this.player.y = 320;
      this.player.aimX = 640;
      this.player.aimY = 220;
      const demo = [
        ['mote', 640, 220], ['mote', 700, 300], ['darter', 760, 180],
        ['spitter', 220, 160], ['splitter', 300, 430], ['hulk', 600, 470],
        ['mote', 150, 350], ['splitter', 850, 430], ['darter', 130, 180],
      ];
      for (const [type, x, y] of demo) {
        const e = makeEnemy(type, x, y, 3);
        e.spawnIn = 0;
        e.angle = Math.atan2(this.player.y - y, this.player.x - x);
        this.enemies.push(e);
      }
      this.spawnQueue = ['mote', 'darter', 'spitter'];
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.12;
        this.bullets.push(makeBullet(480 + Math.cos(a) * 30, 300 + Math.sin(a) * 30, a, 560, 12, 0, true));
      }
      burst(this.particles, 640, 220, PALETTE.mote, 14, 200);
      burst(this.particles, 300, 430, PALETTE.splitter, 10, 160);
      // An enemy orb in flight, so the shot shows return fire too.
      this.bullets.push(makeBullet(240, 190, Math.atan2(320 - 190, 470 - 240), 230, 8, 0, false));
      this.pickups.push(makePickup(540, 420, 'hull'));
      this.bannerText = 'WAVE 3';
      this.bannerSub = 'The void sends more';
      this.bannerTimer = 1.6;
    } else if (shot === 'upgrade') {
      this.startWave(2, rng);
      this.state = 'upgrade';
      this.wave = 2;
      this.wavesCleared = 2;
      this.score = 3120;
      this.lastWaveBonus = 200;
      this.upgradeChoices = [UPGRADES[0], UPGRADES[2], UPGRADES[4]];
    } else if (shot === 'end') {
      this.state = 'over';
      this.wave = 5;
      this.score = 8730;
      this.kills = 64;
      this.wavesCleared = 4;
      this.best = 8730;
      this.player.hull = 0;
    }
  }

  mouseOver(x, y, w, h) {
    const m = this.input.mouse;
    return m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
  }

  start() {
    this.resetRun();
    this.rng = Math.random;
    this.state = 'playing';
    this.startWave(1, Math.random);
    this.sfx.ensure();
    this.sfx.waveHorn();
  }

  startWave(n, rng) {
    this.wave = n;
    this.spawnQueue = buildWaveQueue(n, rng);
    this.spawnTimer = 0.8;
    this.bannerText = `WAVE ${n}`;
    this.bannerSub = n === 1 ? 'Hold the light. Survive.' : this.waveHint(n);
    this.bannerTimer = 1.6;
  }

  waveHint(n) {
    if (n === 2) return 'Darters incoming — watch the telegraph';
    if (n === 3) return 'Spitters fire back from range';
    if (n === 4) return 'Splitters break apart when they die';
    if (n === 6) return 'Something huge stirs in the dark';
    return 'The void sends more';
  }

  beginUpgrade() {
    this.wavesCleared = this.wave;
    this.lastWaveBonus = waveClearBonus(this.wave);
    this.score += this.lastWaveBonus;
    this.state = 'upgrade';
    const pool = shuffle(this.rng, UPGRADES);
    this.upgradeChoices = pool.slice(0, 3);
    this.sfx.upgrade();
  }

  pickUpgrade(u) {
    u.apply(this.player);
    this.sfx.click();
    this.startWave(this.wave + 1, this.rng);
    this.state = 'playing';
    this.sfx.waveHorn();
  }

  fireNova() {
    const p = this.player;
    if (p.novas <= 0 || this.state !== 'playing') return;
    p.novas -= 1;
    this.sfx.nova();
    this.shake(0.5, 14);
    this.drawNovaFlash = 0.35;
    for (const e of this.enemies) {
      if (e.spawnIn > 0) continue;
      this.damageEnemy(e, NOVA.damage, true);
    }
    burst(this.particles, p.x, p.y, PALETTE.pickupNova, 40, 420);
    this.floatTexts.push(makeFloatText(p.x, p.y - 30, 'NOVA!', PALETTE.pickupNova));
  }

  shake(time, mag) {
    this.shakeTime = Math.max(this.shakeTime, time);
    this.shakeMag = Math.max(this.shakeMag, mag);
  }

  damageEnemy(e, dmg, byNova = false) {
    if (e.spawnIn > 0 && !byNova) return;
    e.hull -= dmg;
    e.flash = 0.08;
    if (e.hull <= 0 && !e.dead) {
      e.dead = true;
      this.killEnemy(e);
    }
  }

  killEnemy(e) {
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = COMBO.windowSec;
    this.multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(this.combo / COMBO.stepEvery) * COMBO.stepBonus);
    const gained = Math.round(e.score * this.multiplier);
    this.score += gained;
    this.floatTexts.push(makeFloatText(e.x, e.y - 10, `+${gained}`, e.color));
    burst(this.particles, e.x, e.y, e.color, e.type === 'hulk' ? 30 : 14, 280);
    burst(this.particles, e.x, e.y, '#ffffff', 6, 160);
    this.sfx.explode();
    this.shake(0.12, e.type === 'hulk' ? 8 : 3);
    if (e.type === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const m = makeEnemy('mote', e.x + (i === 0 ? -14 : 14), e.y, this.wave);
        m.spawnIn = 0.25;
        this.enemies.push(m);
      }
    }
    // Drops.
    const roll = this.rng();
    if (roll < DROPS.hullChance) this.pickups.push(makePickup(e.x, e.y, 'hull'));
    else if (roll < DROPS.hullChance + DROPS.overChance) this.pickups.push(makePickup(e.x, e.y, 'over'));
    else if (roll < DROPS.hullChance + DROPS.overChance + DROPS.novaChance) this.pickups.push(makePickup(e.x, e.y, 'nova'));
  }

  hurtPlayer(dmg, fromX, fromY) {
    const p = this.player;
    if (p.invuln > 0 || this.state !== 'playing') return;
    p.hull -= dmg;
    p.invuln = PLAYER.invulnAfterHit;
    p.flash = 0.25;
    this.combo = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    this.sfx.hurt();
    this.shake(0.3, 10);
    burst(this.particles, p.x, p.y, PALETTE.danger, 16, 260);
    // Knockback away from the hit.
    const a = Math.atan2(p.y - fromY, p.x - fromX);
    p.x = Math.min(VIEW.width - 20, Math.max(20, p.x + Math.cos(a) * 26));
    p.y = Math.min(VIEW.height - 20, Math.max(20, p.y + Math.sin(a) * 26));
    if (p.hull <= 0) {
      p.hull = 0;
      this.gameOver();
    }
  }

  gameOver() {
    this.state = 'over';
    this.sfx.gameOver();
    burst(this.particles, this.player.x, this.player.y, PALETTE.player, 50, 380);
    burst(this.particles, this.player.x, this.player.y, '#ffffff', 20, 240);
    this.shake(0.6, 12);
    if (this.score > this.best) {
      this.best = this.score;
      try { localStorage.setItem(BEST_KEY, String(this.best)); } catch { /* storage unavailable */ }
    }
  }

  update(dt) {
    this.time += dt;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.drawNovaFlash > 0) this.drawNovaFlash -= dt;
    // Particles and floating text always animate, even on menus.
    this.updateParticles(dt);
    this.updateFloatTexts(dt);

    if (this.state === 'title') {
      if (this.input.wasPressed('Enter', ' ') || (this.input.clicked && this.startButton && this.mouseOver(this.startButton.x, this.startButton.y, this.startButton.w, this.startButton.h))) {
        this.sfx.ensure();
        this.sfx.click();
        this.start();
      }
      return;
    }
    if (this.state === 'over') {
      if (this.input.wasPressed('r', 'R', 'Enter') || (this.input.clicked && this.restartButton && this.mouseOver(this.restartButton.x, this.restartButton.y, this.restartButton.w, this.restartButton.h))) {
        this.sfx.click();
        this.start();
      }
      return;
    }
    if (this.state === 'upgrade') {
      if (this.input.wasPressed('1')) this.pickUpgrade(this.upgradeChoices[0]);
      else if (this.input.wasPressed('2')) this.pickUpgrade(this.upgradeChoices[1]);
      else if (this.input.wasPressed('3')) this.pickUpgrade(this.upgradeChoices[2]);
      else if (this.input.clicked) {
        for (const c of this.upgradeCards) {
          if (this.mouseOver(c.x, c.y, c.w, c.h)) { this.pickUpgrade(c.upgrade); break; }
        }
      }
      return;
    }
    if (this.state === 'paused') {
      if (this.input.wasPressed('p', 'P', 'Escape')) this.state = 'playing';
      return;
    }
    if (this.state !== 'playing') return;

    // Pause / mute are global while playing.
    if (this.input.wasPressed('p', 'P', 'Escape')) {
      this.state = 'paused';
      return;
    }
    if (this.input.wasPressed('m', 'M')) this.sfx.toggleMute();
    if (this.input.wasPressed('e', 'E', 'q', 'Q')) this.fireNova();

    const p = this.player;
    // Aim follows the mouse.
    p.aimX = this.input.mouse.x;
    p.aimY = this.input.mouse.y;
    p.angle = Math.atan2(p.aimY - p.y, p.aimX - p.x);

    // Movement with a little smoothing.
    const mv = this.input.moveVector();
    const speed = PLAYER.speed * p.speedMul;
    const tx = mv.x * speed;
    const ty = mv.y * speed;
    p.vx += (tx - p.vx) * Math.min(1, dt * 12);
    p.vy += (ty - p.vy) * Math.min(1, dt * 12);
    p.x = Math.min(VIEW.width - 18, Math.max(18, p.x + p.vx * dt));
    p.y = Math.min(VIEW.height - 18, Math.max(18, p.y + p.vy * dt));
    if (p.invuln > 0) p.invuln -= dt;
    if (p.flash > 0) p.flash -= dt;
    if (p.overcharge > 0) p.overcharge -= dt;
    if (p.regen > 0 && p.hull < p.maxHull) p.hull = Math.min(p.maxHull, p.hull + p.regen * dt);

    // Firing: hold mouse or Space.
    p.fireTimer -= dt;
    const firing = this.input.mouse.down || this.input.down(' ');
    if (firing && p.fireTimer <= 0) {
      const interval = PLAYER.fireInterval * p.fireIntervalMul * (p.overcharge > 0 ? 0.5 : 1);
      p.fireTimer = interval;
      const n = p.shots;
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * 0.11;
        const a = p.angle + spread;
        this.bullets.push(makeBullet(
          p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20,
          a, PLAYER.bulletSpeed, PLAYER.bulletDamage * p.damageMul, p.pierce, true,
        ));
      }
      this.sfx.shoot();
      burst(this.particles, p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22, PALETTE.bullet, 2, 90);
    }

    // Combo decay.
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.multiplier = 1;
      }
    }

    this.updateSpawning(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);

    // Wave cleared: queue empty and no live enemies.
    if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.beginUpgrade();
    }
  }

  updateSpawning(dt) {
    if (this.spawnQueue.length === 0) return;
    if (this.enemies.length >= WAVES.maxAlive(this.wave)) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = WAVES.spawnInterval(this.wave);
    const type = this.spawnQueue.shift();
    const pt = edgeSpawnPoint(this.rng, VIEW.width, VIEW.height);
    this.enemies.push(makeEnemy(type, pt.x, pt.y, this.wave));
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.flash > 0) e.flash -= dt;
      if (e.spawnIn > 0) {
        e.spawnIn -= dt;
        continue;
      }
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      e.angle = Math.atan2(dy, dx);
      e.wobble += dt * 3;

      if (e.type === 'darter') {
        if (e.dashing > 0) {
          e.dashing -= dt;
          e.x += e.dashX * e.speed * 4.4 * dt;
          e.y += e.dashY * e.speed * 4.4 * dt;
        } else {
          e.dashTimer -= dt;
          if (dist < 280 && e.dashTimer <= 0) {
            e.dashing = 0.35;
            e.dashX = nx;
            e.dashY = ny;
            e.dashTimer = 1.6 + this.rng() * 0.8;
          } else {
            // Circle-strafe while closing in.
            const wob = Math.sin(e.wobble) * 0.6;
            e.x += (nx * e.speed + -ny * wob * e.speed * 0.5) * dt;
            e.y += (ny * e.speed + nx * wob * e.speed * 0.5) * dt;
          }
        }
      } else if (e.type === 'spitter') {
        // Hold range and shoot.
        const want = 260;
        const radial = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
        e.x += nx * radial * e.speed * dt;
        e.y += ny * radial * e.speed * dt;
        e.x += -ny * Math.sin(e.wobble * 0.5) * e.speed * 0.4 * dt;
        e.y += nx * Math.sin(e.wobble * 0.5) * e.speed * 0.4 * dt;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && dist < 560) {
          e.shootTimer = 2.1 + this.rng() * 0.9;
          this.bullets.push(makeBullet(e.x, e.y, Math.atan2(dy, dx), 230, e.damage, 0, false));
          this.sfx.enemyShoot();
        }
      } else {
        // Chasers: mote, splitter, hulk.
        const wob = e.type === 'mote' ? Math.sin(e.wobble) * 0.35 : 0;
        e.x += (nx * e.speed + -ny * wob * e.speed) * dt;
        e.y += (ny * e.speed + nx * wob * e.speed) * dt;
      }
      // Keep inside the arena (they entered from outside, then stay in).
      e.x = Math.min(VIEW.width + 40, Math.max(-40, e.x));
      e.y = Math.min(VIEW.height + 40, Math.max(-40, e.y));

      // Touching the player hurts.
      const rr = e.radius + p.radius - 2;
      if (dist < rr) this.hurtPlayer(e.damage, e.x, e.y);
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  updateBullets(dt) {
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < -20 || b.x > VIEW.width + 20 || b.y < -20 || b.y > VIEW.height + 20) b.life = 0;
      if (b.life <= 0) { b.dead = true; continue; }
      if (b.friendly) {
        for (const e of this.enemies) {
          if (e.dead || e.spawnIn > 0) continue;
          const rr = e.radius + b.radius;
          const dx = e.x - b.x;
          const dy = e.y - b.y;
          if (dx * dx + dy * dy < rr * rr) {
            this.damageEnemy(e, b.damage);
            burst(this.particles, b.x, b.y, e.color, 3, 120);
            this.sfx.hit();
            if (b.pierce > 0) {
              b.pierce -= 1;
            } else {
              b.dead = true;
            }
            break;
          }
        }
      } else {
        const p = this.player;
        const rr = p.radius + b.radius - 2;
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        if (dx * dx + dy * dy < rr * rr) {
          b.dead = true;
          this.hurtPlayer(b.damage, b.x - b.vx * 0.05, b.y - b.vy * 0.05);
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  updatePickups(dt) {
    const p = this.player;
    const magnetR = PLAYER.magnetRadius * p.magnetMul;
    for (const pk of this.pickups) {
      pk.life -= dt;
      pk.bob += dt;
      const dx = p.x - pk.x;
      const dy = p.y - pk.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < magnetR) {
        const pull = 420 * (1 - dist / magnetR) + 120;
        pk.x += (dx / dist) * pull * dt;
        pk.y += (dy / dist) * pull * dt;
      } else {
        pk.x += pk.vx * dt;
        pk.y += pk.vy * dt;
        pk.vx *= 1 - 2 * dt;
        pk.vy *= 1 - 2 * dt;
      }
      if (dist < p.radius + pk.radius + 6) {
        pk.life = 0;
        if (pk.type === 'hull') {
          p.hull = Math.min(p.maxHull, p.hull + DROPS.hullHeal);
          this.floatTexts.push(makeFloatText(p.x, p.y - 24, `+${DROPS.hullHeal} HULL`, PALETTE.pickupHull));
        } else if (pk.type === 'over') {
          p.overcharge = DROPS.overDuration;
          this.floatTexts.push(makeFloatText(p.x, p.y - 24, 'OVERCHARGE!', PALETTE.pickupOver));
        } else {
          p.novas += 1;
          this.floatTexts.push(makeFloatText(p.x, p.y - 24, '+1 NOVA', PALETTE.pickupNova));
        }
        this.sfx.pickup();
        burst(this.particles, pk.x, pk.y, '#ffffff', 8, 140);
      }
    }
    this.pickups = this.pickups.filter((pk) => pk.life > 0);
  }

  updateParticles(dt) {
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      const drag = 1 - pt.drag * dt;
      pt.vx *= drag;
      pt.vy *= drag;
      if (pt.life <= 0) pt.dead = true;
    }
    this.particles = this.particles.filter((pt) => !pt.dead);
  }

  updateFloatTexts(dt) {
    for (const t of this.floatTexts) {
      t.life -= dt;
      if (t.life <= 0) t.dead = true;
    }
    this.floatTexts = this.floatTexts.filter((t) => !t.dead);
  }

  render() {
    const { ctx } = this;
    let sx = 0;
    let sy = 0;
    if (this.shakeTime > 0) {
      const m = this.shakeMag * (this.shakeTime / 0.5);
      sx = (Math.random() - 0.5) * m;
      sy = (Math.random() - 0.5) * m;
    }
    this.renderer.clear();
    this.renderer.drawBackground(this.time, sx, sy);
    ctx.save();
    ctx.translate(sx, sy);
    for (const pk of this.pickups) this.renderer.drawPickup(pk, this.time);
    for (const e of this.enemies) this.renderer.drawEnemy(e, this.time);
    for (const b of this.bullets) this.renderer.drawBullet(b);
    if (this.state !== 'over') this.renderer.drawPlayer(this.player, this.time);
    this.renderer.drawParticles(this.particles);
    this.renderer.drawFloatTexts(this.floatTexts);
    ctx.restore();
    if (this.drawNovaFlash > 0) {
      ctx.fillStyle = `rgba(190, 240, 255, ${this.drawNovaFlash * 1.4})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    if (this.state === 'playing' || this.state === 'paused') this.renderer.drawHud(this);
    if (this.state === 'title') this.renderer.drawTitle(this);
    else if (this.state === 'upgrade') this.renderer.drawUpgrade(this);
    else if (this.state === 'paused') this.renderer.drawPaused(this);
    else if (this.state === 'over') this.renderer.drawGameOver(this);
    // Hit flash vignette.
    if (this.player.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 80, ${this.player.flash * 0.5})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  frame(now) {
    const dt = Math.min(0.033, Math.max(0, (now - this.last) / 1000 || 0.016));
    this.last = now;
    this.update(dt);
    this.render();
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  run() {
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }
}
