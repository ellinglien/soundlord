import { test } from "node:test";
import assert from "node:assert/strict";
import { AudioEngine } from "../src/audio-engine.js";

// Minimal fake Web Audio context for unit testing.
function makeFakeContext() {
  const started = [];
  const stopped = [];
  return {
    state: "running",
    destination: { id: "destination" },
    resume() {},
    createGain() {
      return { gain: { value: 1 }, connect() {} };
    },
    createBufferSource() {
      const node = {
        buffer: null,
        onended: null,
        connect() {},
        start() { started.push(node); },
        stop() { stopped.push(node); },
      };
      return node;
    },
    _started: started,
    _stopped: stopped,
  };
}

test("overlap mode keeps every triggered source active", () => {
  const ctx = makeFakeContext();
  const engine = new AudioEngine(() => ctx);
  const buffer = { duration: 1 };

  engine.play("pad1", buffer, { volume: 0.5, mode: "overlap" });
  engine.play("pad1", buffer, { volume: 0.5, mode: "overlap" });

  assert.equal(engine.active.get("pad1").size, 2);
  assert.equal(ctx._started.length, 2);
  assert.equal(ctx._stopped.length, 0);
});

test("restart mode stops prior sources before starting a new one", () => {
  const ctx = makeFakeContext();
  const engine = new AudioEngine(() => ctx);
  const buffer = { duration: 1 };

  engine.play("bell", buffer, { mode: "restart" });
  engine.play("bell", buffer, { mode: "restart" });

  assert.equal(engine.active.get("bell").size, 1);
  assert.equal(ctx._started.length, 2);
  assert.equal(ctx._stopped.length, 1);
});

test("stopAll stops sources across all pads", () => {
  const ctx = makeFakeContext();
  const engine = new AudioEngine(() => ctx);
  const buffer = { duration: 1 };

  engine.play("horn", buffer, { mode: "overlap" });
  engine.play("horn", buffer, { mode: "overlap" });
  engine.play("bell", buffer, { mode: "overlap" });

  engine.stopAll();

  assert.equal(engine.active.get("horn").size, 0);
  assert.equal(engine.active.get("bell").size, 0);
  assert.equal(ctx._stopped.length, 3);
});
