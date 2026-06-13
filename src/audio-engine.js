export class AudioEngine {
  constructor(contextFactory = () => new AudioContext()) {
    this._contextFactory = contextFactory;
    this.ctx = null;
    this.masterGain = null;
    this.active = new Map(); // padId -> Set<sourceNode>
  }

  _ensure() {
    if (!this.ctx) {
      this.ctx = this._contextFactory();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setMasterVolume(v) {
    this._ensure();
    this.masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  async decode(arrayBuffer) {
    this._ensure();
    return await this.ctx.decodeAudioData(arrayBuffer);
  }

  play(padId, buffer, { volume = 1, mode = "overlap", offset = 0 } = {}) {
    this._ensure();
    if (mode === "toggle") {
      const existing = this.active.get(padId);
      if (existing && existing.size > 0) {
        this.stopPad(padId);
        return null;
      }
    }
    if (mode === "restart") this.stopPad(padId);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));
    src.connect(gain);
    gain.connect(this.masterGain);

    if (!this.active.has(padId)) this.active.set(padId, new Set());
    const set = this.active.get(padId);
    set.add(src);
    src.onended = () => set.delete(src);
    src.start(0, Math.max(0, offset));
    return src;
  }

  stopPad(padId) {
    const set = this.active.get(padId);
    if (!set) return;
    for (const src of set) {
      try { src.stop(0); } catch (e) { /* already stopped */ }
    }
    set.clear();
  }

  stopAll() {
    for (const padId of this.active.keys()) this.stopPad(padId);
  }
}
