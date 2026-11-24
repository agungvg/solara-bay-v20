// Synthesised audio for Solara Bay: engine hum, two-tone sirens, gunshots,
// radio blips and mission stingers — all WebAudio oscillators and noise,
// no audio files, no network.
export class AudioEngine {
  constructor() {
    this.ctx = null; this.engineOsc = null; this.engineGain = null;
    this.sirenOn = false; this.sirenTimer = null; this.radioTimer = null;
    this.enabled = false;
  }
  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.enabled = true;
      this.startEngine();
      this.startRadio();
    } catch (e) { this.enabled = false; }
  }
  startEngine() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 420;
    this.engineOsc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engineOsc.start();
  }
  setEngine(speedKmh, on) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(45 + Math.abs(speedKmh) * 1.1, t, 0.1);
    this.engineGain.gain.setTargetAtTime(on ? 0.05 + Math.abs(speedKmh) / 900 : 0.0, t, 0.15);
  }
  setSiren(on) {
    if (!this.ctx) return;
    if (on === this.sirenOn) return;
    this.sirenOn = on;
    if (!on) { if (this.sirenTimer) clearInterval(this.sirenTimer); this.sirenTimer = null; return; }
    let hi = false;
    this.sirenTimer = setInterval(() => {
      if (!this.ctx) return;
      const o = this.ctx.createOscillator(); const gn = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = hi ? 960 : 720; hi = !hi;
      gn.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.42);
      o.connect(gn); gn.connect(this.master); o.start(); o.stop(this.ctx.currentTime + 0.45);
    }, 450);
  }
  gunshot() {
    if (!this.ctx) return;
    const dur = 0.16;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const gn = this.ctx.createGain(); gn.gain.value = 0.35;
    const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 1800;
    src.connect(filt); filt.connect(gn); gn.connect(this.master); src.start();
  }
  blip(freq = 880, dur = 0.09, vol = 0.12) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(); const gn = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    gn.gain.setValueAtTime(vol, this.ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(gn); gn.connect(this.master); o.start(); o.stop(this.ctx.currentTime + dur + 0.02);
  }
  stinger(win = true) {
    if (!this.ctx) return;
    const notes = win ? [523, 659, 784, 1046] : [392, 330, 262, 196];
    notes.forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 0.16), i * 130));
  }
  startRadio() {
    // lo-fi synth radio: a slow bass line + soft lead, quiet under the game
    const bass = [110, 98, 130, 98, 110, 146, 130, 98];
    let i = 0;
    this.radioTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const o = this.ctx.createOscillator(); const gn = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.value = bass[i % bass.length]; i++;
      gn.gain.setValueAtTime(0.045, this.ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.9);
      o.connect(gn); gn.connect(this.master); o.start(); o.stop(this.ctx.currentTime + 0.95);
    }, 950);
  }
}
