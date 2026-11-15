// VOIDLIGHT — all drawing: starfield background, entities, HUD and
// the title / upgrade / pause / game-over screens. No game logic here.

import { VIEW, PALETTE } from './config.js';

// Pre-rendered glow sprites, so drawing a glow is a cheap drawImage
// instead of a shadowBlur on every entity every frame.
const glowCache = new Map();
export function glowSprite(color) {
  let sprite = glowCache.get(color);
  if (sprite) return sprite;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color + 'aa');
  grad.addColorStop(1, color + '00');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(color, c);
  return c;
}

function hexA(color, alpha) {
  // '#rrggbb' + two hex digits of alpha.
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return color + a;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    for (let i = 0; i < 130; i++) {
      this.stars.push({
        x: Math.random() * VIEW.width,
        y: Math.random() * VIEW.height,
        r: 0.5 + Math.random() * 1.6,
        layer: 1 + Math.floor(Math.random() * 3),
        tw: Math.random() * Math.PI * 2,
      });
    }
    this.nebulae = [
      { x: 180, y: 130, r: 260, color: PALETTE.nebulaCyan },
      { x: 780, y: 420, r: 300, color: PALETTE.nebulaMagenta },
      { x: 520, y: 90, r: 200, color: PALETTE.nebulaAmber },
    ];
  }

  clear() {
    const { ctx } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    grad.addColorStop(0, PALETTE.spaceTop);
    grad.addColorStop(1, PALETTE.spaceBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  drawBackground(time, shakeX, shakeY) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    for (const n of this.nebulae) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    // Parallax starfield, drifting slowly downward.
    for (const s of this.stars) {
      const y = (s.y + time * 4 * s.layer) % VIEW.height;
      const twinkle = 0.55 + 0.45 * Math.sin(time * 2 + s.tw);
      ctx.globalAlpha = twinkle * (0.35 + s.layer * 0.2);
      ctx.fillStyle = '#cfe4ff';
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Faint arena grid.
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= VIEW.width; x += 60) { ctx.moveTo(x, 0); ctx.lineTo(x, VIEW.height); }
    for (let y = 0; y <= VIEW.height; y += 60) { ctx.moveTo(0, y); ctx.lineTo(VIEW.width, y); }
    ctx.stroke();
    // Arena border.
    ctx.strokeStyle = 'rgba(95, 242, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, VIEW.width - 12, VIEW.height - 12);
    ctx.restore();
  }

  drawGlow(x, y, radius, color, alpha = 0.8) {
    const { ctx } = this;
    ctx.globalAlpha = alpha;
    ctx.drawImage(glowSprite(color), x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;
  }

  drawPlayer(p, time) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(p.x, p.y);
    const blink = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    ctx.globalAlpha = blink ? 0.35 : 1;
    // Glow + hull: a little lantern-ship pointing at the aim angle.
    this.drawGlow(0, 0, 46, PALETTE.player, 0.7);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#0e2a4a';
    ctx.strokeStyle = PALETTE.player;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Engine flame flicker.
    const flame = 8 + Math.sin(time * 30) * 3;
    ctx.fillStyle = hexA('#ffc85f', 0.85);
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.lineTo(-7 - flame, 0);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();
    // Bright core.
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(2, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Aim reticle at the mouse.
    ctx.save();
    ctx.strokeStyle = hexA(PALETTE.player, 0.5);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.aimX, p.aimY, 10, 0, Math.PI * 2);
    ctx.moveTo(p.aimX - 15, p.aimY);
    ctx.lineTo(p.aimX - 6, p.aimY);
    ctx.moveTo(p.aimX + 6, p.aimY);
    ctx.lineTo(p.aimX + 15, p.aimY);
    ctx.moveTo(p.aimX, p.aimY - 15);
    ctx.lineTo(p.aimX, p.aimY - 6);
    ctx.moveTo(p.aimX, p.aimY + 6);
    ctx.lineTo(p.aimX, p.aimY + 15);
    ctx.stroke();
    ctx.restore();
  }

  drawEnemy(e, time) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.spawnIn > 0) {
      // Portal telegraph: a shrinking ring where it will appear.
      const p = 1 - e.spawnIn / 0.6;
      ctx.strokeStyle = hexA(e.color, 0.9 - p * 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 26 * (1 - p), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.25 + p * 0.5;
    }
    const flash = e.flash > 0;
    this.drawGlow(0, 0, e.radius * 2.4, e.color, 0.55);
    ctx.rotate(e.angle);
    ctx.fillStyle = flash ? '#ffffff' : '#0c1226';
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (e.type === 'mote') {
      // Spiky circle.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time * 1.5;
        const r = i % 2 === 0 ? e.radius + 5 : e.radius - 3;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (e.type === 'darter') {
      ctx.moveTo(e.radius + 4, 0);
      ctx.lineTo(-e.radius, -e.radius * 0.8);
      ctx.lineTo(-e.radius * 0.4, 0);
      ctx.lineTo(-e.radius, e.radius * 0.8);
      ctx.closePath();
    } else if (e.type === 'spitter') {
      ctx.moveTo(0, -e.radius);
      ctx.lineTo(e.radius, 0);
      ctx.lineTo(0, e.radius);
      ctx.lineTo(-e.radius, 0);
      ctx.closePath();
    } else if (e.type === 'splitter') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else {
      // hulk: heavy octagon with an armor ring.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    // Core eye.
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(3, e.radius * 0.22), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Hull bar for tougher enemies.
    if (e.maxHull >= 30 && e.hull < e.maxHull) {
      const w = e.radius * 2;
      const frac = Math.max(0, e.hull / e.maxHull);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w, 4);
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w * frac, 4);
    }
  }

  drawBullet(b) {
    const { ctx } = this;
    if (b.friendly) {
      this.drawGlow(b.x, b.y, 12, PALETTE.bullet, 0.8);
      ctx.fillStyle = PALETTE.bullet;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      this.drawGlow(b.x, b.y, 16, PALETTE.spitter, 0.8);
      ctx.fillStyle = '#e9c8ff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.spitter;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  drawPickup(p, time) {
    const { ctx } = this;
    const bob = Math.sin(time * 4 + p.bob) * 2;
    const color = p.type === 'hull' ? PALETTE.pickupHull : p.type === 'over' ? PALETTE.pickupOver : PALETTE.pickupNova;
    const label = p.type === 'hull' ? '+' : p.type === 'over' ? 'x2' : 'N';
    this.drawGlow(p.x, p.y + bob, 26, color, 0.7);
    ctx.fillStyle = '#0c1226';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, p.x, p.y + bob + 0.5);
  }

  drawParticles(particles) {
    const { ctx } = this;
    for (const p of particles) {
      const frac = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = frac;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * frac + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFloatTexts(texts) {
    const { ctx } = this;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of texts) {
      const frac = t.life / t.maxLife;
      ctx.globalAlpha = Math.min(1, frac * 1.5);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y - (1 - frac) * 24);
    }
    ctx.globalAlpha = 1;
  }

  drawHud(game) {
    const { ctx } = this;
    const p = game.player;
    // Hull bar.
    const barW = 220;
    const barH = 14;
    const bx = 18;
    const by = 16;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
    const hullFrac = Math.max(0, p.hull / p.maxHull);
    ctx.fillStyle = hullFrac > 0.5 ? PALETTE.pickupHull : hullFrac > 0.25 ? PALETTE.pickupOver : PALETTE.danger;
    ctx.fillRect(bx, by, barW * hullFrac, barH);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`HULL ${Math.ceil(p.hull)} / ${p.maxHull}`, bx + barW + 10, by + barH / 2);
    // Wave, score, combo.
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(`WAVE ${game.wave}`, VIEW.width / 2, 24);
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(`${game.score.toLocaleString('en-US')}`, VIEW.width / 2, 50);
    if (game.combo >= 5) {
      ctx.fillStyle = PALETTE.pickupOver;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(`COMBO x${game.multiplier.toFixed(1)}  (${game.combo})`, VIEW.width / 2, 72);
    }
    // Right side: enemies left, novas, overcharge.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 14px system-ui, sans-serif';
    const left = game.enemies.length + game.spawnQueue.length;
    ctx.fillText(`HOSTILES ${left}`, VIEW.width - 18, 22);
    ctx.fillStyle = PALETTE.pickupNova;
    ctx.fillText(`NOVA x${p.novas}  [E]`, VIEW.width - 18, 44);
    if (p.overcharge > 0) {
      ctx.fillStyle = PALETTE.pickupOver;
      ctx.fillText(`OVERCHARGE ${p.overcharge.toFixed(1)}s`, VIEW.width - 18, 66);
    }
    if (game.sfx.muted) {
      ctx.fillStyle = PALETTE.textDim;
      ctx.fillText('MUTED [M]', VIEW.width - 18, 88);
    }
    // Wave banner (fades).
    if (game.bannerTimer > 0) {
      const a = Math.min(1, game.bannerTimer);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.fillText(game.bannerText, VIEW.width / 2, VIEW.height / 2 - 60);
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.textDim;
      ctx.fillText(game.bannerSub, VIEW.width / 2, VIEW.height / 2 - 28);
      ctx.globalAlpha = 1;
    }
  }

  drawTitle(game) {
    const { ctx } = this;
    ctx.textAlign = 'center';
    // Big glowing title.
    this.drawGlow(VIEW.width / 2, 150, 190, PALETTE.player, 0.5);
    ctx.fillStyle = PALETTE.player;
    ctx.font = 'bold 72px system-ui, sans-serif';
    ctx.fillText('VOIDLIGHT', VIEW.width / 2, 165);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('The last lantern-ship holds the drift against the void.', VIEW.width / 2, 205);
    // Controls card.
    ctx.fillStyle = 'rgba(10, 18, 44, 0.85)';
    ctx.strokeStyle = PALETTE.cardEdge;
    ctx.lineWidth = 1.5;
    const cw = 460;
    const ch = 150;
    const cx = VIEW.width / 2 - cw / 2;
    const cy = 250;
    ctx.beginPath();
    ctx.roundRect(cx, cy, cw, ch, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('HOW TO PLAY', VIEW.width / 2, cy + 26);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.textDim;
    const lines = [
      'WASD / Arrows — fly     Mouse — aim     Hold Click / Space — fire',
      'E — nova bomb (clears the screen)     P — pause     M — mute',
      'Survive the waves. Pick an upgrade after each wave.',
      'Grabs:  + hull    x2 overcharge    N nova charge',
    ];
    lines.forEach((l, i) => ctx.fillText(l, VIEW.width / 2, cy + 54 + i * 24));
    // Start button.
    const bw = 260;
    const bh = 54;
    const bx = VIEW.width / 2 - bw / 2;
    const by = 440;
    const hover = game.mouseOver(bx, by, bw, bh);
    ctx.fillStyle = hover ? '#1b3a6e' : '#12264f';
    ctx.strokeStyle = PALETTE.player;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.playerCore;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('▶  LIGHT THE LANTERN', VIEW.width / 2, by + bh / 2 + 1);
    if (game.best > 0) {
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(`Best score: ${game.best.toLocaleString('en-US')}`, VIEW.width / 2, 530);
    }
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('A tiny original game — no downloads, no network, just you and the void.', VIEW.width / 2, 566);
    game.startButton = { x: bx, y: by, w: bw, h: bh };
  }

  drawUpgrade(game) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(3, 6, 18, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(`WAVE ${game.wave} CLEARED`, VIEW.width / 2, 110);
    ctx.fillStyle = PALETTE.pickupOver;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(`+${game.lastWaveBonus} wave bonus`, VIEW.width / 2, 142);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Choose an upgrade — click a card or press 1 / 2 / 3', VIEW.width / 2, 172);
    const cw = 250;
    const ch = 170;
    const gap = 24;
    const total = cw * 3 + gap * 2;
    const x0 = VIEW.width / 2 - total / 2;
    const y0 = 210;
    game.upgradeCards = [];
    game.upgradeChoices.forEach((u, i) => {
      const x = x0 + i * (cw + gap);
      const hover = game.mouseOver(x, y0, cw, ch);
      ctx.fillStyle = hover ? '#182a58' : PALETTE.card;
      ctx.strokeStyle = hover ? PALETTE.player : PALETTE.cardEdge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y0, cw, ch, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.player;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(`[${i + 1}]`, x + cw / 2, y0 + 30);
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(u.name, x + cw / 2, y0 + 66);
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(u.desc, x + cw / 2, y0 + 98);
      game.upgradeCards.push({ x, y: y0, w: cw, h: ch, upgrade: u });
    });
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`Hull ${Math.ceil(game.player.hull)} / ${game.player.maxHull}    Score ${game.score.toLocaleString('en-US')}`, VIEW.width / 2, 430);
  }

  drawPaused(game) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(3, 6, 18, 0.7)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2 - 10);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Press P or Esc to resume', VIEW.width / 2, VIEW.height / 2 + 30);
  }

  drawGameOver(game) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(10, 4, 10, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    this.drawGlow(VIEW.width / 2, 150, 170, PALETTE.danger, 0.45);
    ctx.fillStyle = PALETTE.danger;
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.fillText('THE LIGHT FADES', VIEW.width / 2, 160);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(`The void took the lantern on wave ${game.wave}.`, VIEW.width / 2, 200);
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`SCORE  ${game.score.toLocaleString('en-US')}`, VIEW.width / 2, 258);
    if (game.score >= game.best && game.score > 0) {
      ctx.fillStyle = PALETTE.pickupOver;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('★ NEW BEST ★', VIEW.width / 2, 292);
    } else {
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(`Best: ${game.best.toLocaleString('en-US')}`, VIEW.width / 2, 292);
    }
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`${game.kills} void creatures destroyed    •    ${game.wavesCleared} waves cleared`, VIEW.width / 2, 330);
    // Restart button.
    const bw = 260;
    const bh = 54;
    const bx = VIEW.width / 2 - bw / 2;
    const by = 380;
    const hover = game.mouseOver(bx, by, bw, bh);
    ctx.fillStyle = hover ? '#5e1b28' : '#3a1420';
    ctx.strokeStyle = PALETTE.danger;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe9ec';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('↻  FLY AGAIN  (R)', VIEW.width / 2, by + bh / 2 + 1);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Or press Enter to restart', VIEW.width / 2, 470);
    game.restartButton = { x: bx, y: by, w: bw, h: bh };
  }
}
