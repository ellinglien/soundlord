export class AudioEngine {
  constructor(contextFactory = () => new AudioContext()) {
    this._contextFactory = contextFactory;
    this.ctx = null;
    this.masterGain = null;
    this.active = new Map(); // padId -> Set<sourceNode>
    this._lastActive = new Map(); // padId -> boolean
    this.onActiveChange = null; // (padId, isActive) => void
  }

  _emitState(padId) {
    const set = this.active.get(padId);
    const isActive = !!(set && set.size > 0);
    const was = this._lastActive.get(padId) ?? false;
    if (isActive !== was) {
      this._lastActive.set(padId, isActive);
      if (this.onActiveChange) this.onActiveChange(padId, isActive);
    }
  }

  _stopSilent(padId) {
    const set = this.active.get(padId);
    if (!set) return;
    for (const src of set) {
      src.onended = null;
      try { src.stop(0); } catch (e) { /* already stopped */ }
    }
    set.clear();
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

  play(padId, buffer, { volume = 1, mode = "overlap", offset = 0, duration } = {}) {
    this._ensure();
    if (mode === "toggle") {
      const existing = this.active.get(padId);
      if (existing && existing.size > 0) {
        this.stopPad(padId);
        return null;
      }
    }
    if (mode === "restart") this._stopSilent(padId);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));
    src.connect(gain);
    gain.connect(this.masterGain);

    if (!this.active.has(padId)) this.active.set(padId, new Set());
    const set = this.active.get(padId);
    set.add(src);
    src.onended = () => {
      set.delete(src);
      this._emitState(padId);
    };
    const safeOffset = Math.max(0, offset);
    if (duration != null && duration > 0) {
      src.start(0, safeOffset, duration);
    } else {
      src.start(0, safeOffset);
    }
    this._emitState(padId);
    return src;
  }

  stopPad(padId) {
    this._stopSilent(padId);
    this._emitState(padId);
  }

  stopAll() {
    for (const padId of this.active.keys()) this.stopPad(padId);
  }
}
