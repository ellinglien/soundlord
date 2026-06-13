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
        start(when, offset, duration) {
          node.startedAt = offset ?? 0;
          node.duration = duration;
          started.push(node);
        },
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

function makeGainTrackingContext() {
  const gains = [];
  return {
    state: "running",
    destination: { id: "destination" },
    resume() {},
    createGain() {
      const node = { gain: { value: 1 }, connect() {} };
      gains.push(node);
      return node;
    },
    createBufferSource() {
      return { buffer: null, onended: null, connect() {}, start() {}, stop() {} };
    },
    _gains: gains,
  };
}

test("play applies per-pad volume to a dedicated gain node", () => {
  const ctx = makeGainTrackingContext();
  const engine = new AudioEngine(() => ctx);
  // first gain created is the master gain in _ensure()
  engine.play("p", { duration: 1 }, { volume: 0.25, mode: "overlap" });
  const padGain = ctx._gains[ctx._gains.length - 1];
  assert.equal(padGain.gain.value, 0.25);
});

test("setMasterVolume sets the master gain", () => {
  const ctx = makeGainTrackingContext();
  const engine = new AudioEngine(() => ctx);
  engine.setMasterVolume(0.7);
  // master gain is the first gain node created
  assert.equal(ctx._gains[0].gain.value, 0.7);
});

test("play forwards offset to source.start", () => {
  const ctx = makeFakeContext();
  const engine = new AudioEngine(() => ctx);
  engine.play("p", { duration: 5 }, { mode: "overlap", offset: 0.25 });
  assert.equal(ctx._started[0].startedAt, 0.25);
});

test("play clamps negative offset to 0", () => {
  const ctx = makeFakeContext();
  const engine = new AudioEngine(() => ctx);
  engine.play("p", { duration: 5 }, { mode: "overlap", offset: -1 });
  assert.equal(ctx._started[0].startedAt, 0);
});

test("play forwards duration when provided (trim end)", () => {
  const ctx = makeFakeContext();
  const engine = new AudioEngine(() => ctx);
  engine.play("p", { duration: 5 }, { mode: "overlap", offset: 0.5, duration: 2 });
  assert.equal(ctx._started[0].startedAt, 0.5);
  assert.equal(ctx._started[0].duration, 2);
});

test("play omits duration when not provided (play to end)", () => {
  const ctx = makeFakeContext();
  const engine = new AudioEngine(() => ctx);
  engine.play("p", { duration: 5 }, { mode: "overlap", offset: 0 });
  assert.equal(ctx._started[0].duration, undefined);
});

test("onActiveChange fires once on start and once when all sources end", () => {
  const ctx = makeFakeContext();
  const engine = new AudioEngine(() => ctx);
  const events = [];
  engine.onActiveChange = (id, active) => events.push([id, active]);
  const buffer = { duration: 1 };

  engine.play("p", buffer, { mode: "overlap" });
  engine.play("p", buffer, { mode: "overlap" }); // second source — no new event
  assert.deepEqual(events, [["p", true]]);

  // simulate one source ending
  const sources = [...engine.active.get("p")];
  sources[0].onended();
  // still one source left, no event
  assert.deepEqual(events, [["p", true]]);

  // last one ends
  sources[1].onended();
  assert.deepEqual(events, [["p", true], ["p", false]]);
});

test("restart mode does not emit a false→true blip", () => {
  const ctx = makeFakeContext();
  const engine = new AudioEngine(() => ctx);
  const events = [];
  engine.onActiveChange = (id, active) => events.push([id, active]);

  engine.play("p", { duration: 1 }, { mode: "restart" });
  engine.play("p", { duration: 1 }, { mode: "restart" });
  engine.play("p", { duration: 1 }, { mode: "restart" });

  // Only one transition to true; never a false in between.
  assert.deepEqual(events, [["p", true]]);
});

test("toggle mode: starts when idle, stops when playing, restarts after stop", () => {
  const ctx = makeFakeContext();
  const engine = new AudioEngine(() => ctx);
  const buffer = { duration: 1 };

  engine.play("p", buffer, { mode: "toggle" }); // start
  assert.equal(engine.active.get("p").size, 1);
  assert.equal(ctx._started.length, 1);

  engine.play("p", buffer, { mode: "toggle" }); // stop
  assert.equal(engine.active.get("p").size, 0);
  assert.equal(ctx._stopped.length, 1);
  assert.equal(ctx._started.length, 1); // no new start

  engine.play("p", buffer, { mode: "toggle" }); // start again
  assert.equal(engine.active.get("p").size, 1);
  assert.equal(ctx._started.length, 2);
});
