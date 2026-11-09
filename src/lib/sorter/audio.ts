"use client";

/**
 * Tiny WebAudio synth for the SIFT·1 demo.
 * All sounds are synthesised — no assets, no network. Volume kept gentle.
 */
class SorterAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (v) this.ensure();
  }

  private tone(
    freqFrom: number,
    freqTo: number,
    dur: number,
    type: OscillatorType = "sine",
    vol = 1,
    delay = 0
  ) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, freq: number, vol = 0.5, delay = 0) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  toss() {
    this.tone(520, 240, 0.22, "sine", 0.5);
  }
  scan() {
    this.tone(880, 1320, 0.28, "sine", 0.35);
    this.tone(1320, 1760, 0.22, "sine", 0.22, 0.24);
  }
  servo(open: boolean) {
    this.noise(0.16, open ? 950 : 620, 0.35);
  }
  drop() {
    this.tone(180, 60, 0.16, "triangle", 0.9);
    this.noise(0.09, 240, 0.4, 0.02);
  }
  chime() {
    this.tone(740, 740, 0.14, "sine", 0.4);
    this.tone(1110, 1110, 0.22, "sine", 0.35, 0.11);
  }
  alert() {
    this.tone(392, 392, 0.13, "square", 0.28);
    this.tone(311, 311, 0.2, "square", 0.28, 0.15);
  }
  boot() {
    this.tone(523, 523, 0.1, "sine", 0.3);
    this.tone(659, 659, 0.1, "sine", 0.3, 0.1);
    this.tone(784, 784, 0.16, "sine", 0.3, 0.2);
  }
}

export const sorterAudio = new SorterAudio();
