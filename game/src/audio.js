// VOIDLIGHT — synthesized sound effects, no audio files.
// Everything is an oscillator or filtered noise through WebAudio, created
// lazily on the first user gesture (browsers block audio before that).

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.16;
    return this.muted;
  }

  tone(freqFrom, freqTo, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, vol, filterFreq) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  shoot() { this.tone(880, 320, 0.07, 'square', 0.10); }
  enemyShoot() { this.tone(300, 140, 0.12, 'sawtooth', 0.07); }
  hit() { this.noise(0.06, 0.12, 2400); }
  explode() { this.noise(0.35, 0.30, 900); this.tone(160, 40, 0.3, 'sine', 0.25); }
  hurt() { this.tone(220, 60, 0.25, 'sawtooth', 0.22); this.noise(0.15, 0.18, 700); }
  pickup() { this.tone(660, 990, 0.12, 'sine', 0.16); this.tone(990, 1320, 0.14, 'sine', 0.12); }
  nova() { this.noise(0.7, 0.35, 1600); this.tone(80, 480, 0.6, 'sine', 0.28); }
  waveHorn() { this.tone(220, 440, 0.35, 'triangle', 0.18); this.tone(330, 660, 0.35, 'triangle', 0.12); }
  upgrade() { this.tone(523, 523, 0.1, 'sine', 0.15); this.tone(659, 659, 0.1, 'sine', 0.15); this.tone(784, 784, 0.18, 'sine', 0.15); }
  gameOver() { this.tone(392, 392, 0.3, 'triangle', 0.18); this.tone(311, 311, 0.3, 'triangle', 0.18); this.tone(233, 110, 0.7, 'triangle', 0.18); }
  click() { this.tone(1200, 900, 0.05, 'sine', 0.10); }
}
