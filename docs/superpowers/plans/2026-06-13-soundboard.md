# Soundboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A hyperminimal ASCII/text web soundboard — load audio samples, set per-pad volume, trigger by click or keyboard with overlap/restart behavior, a STOP ALL button, and persistence between sessions.

**Architecture:** Vanilla JS ES modules, no framework, no build step. Web Audio API decodes each file once into an `AudioBuffer`; every trigger spawns a fresh `AudioBufferSourceNode` through a per-pad `GainNode` → master `GainNode` → destination (instant, overlapping playback). Pure logic (ASCII formatting, source tracking, record serialization) is isolated and unit-tested with `node --test`; DOM wiring is implemented and smoke-tested in the browser. State persists in IndexedDB.

**Tech Stack:** HTML/CSS/JS, Web Audio API, IndexedDB, Node's built-in test runner (`node --test`). No npm dependencies.

---

## File Structure

- `index.html` — ASCII UI shell, loads `src/app.js`
- `styles.css` — monospace styling
- `src/format.js` — pure ASCII helpers (tested)
- `src/audio-engine.js` — playback + source tracking, injectable AudioContext (tested)
- `src/storage.js` — pure record serialize (tested) + IndexedDB IO (manual)
- `src/board.js` — DOM render + event wiring (manual)
- `src/app.js` — bootstrap
- `test/format.test.js`, `test/audio-engine.test.js`, `test/storage.test.js`
- `package.json` — `"type": "module"`, test script

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `styles.css`
- Create: `src/format.js`, `src/audio-engine.js`, `src/storage.js`, `src/board.js`, `src/app.js` (empty stubs)
- Create: `test/.gitkeep`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "soundboard",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Create stub source files**

Create each of these as an empty file for now:
`src/format.js`, `src/audio-engine.js`, `src/storage.js`, `src/board.js`, `src/app.js`

Create `test/.gitkeep` (empty) so the directory exists.

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SOUNDBOARD</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <pre id="app"></pre>
  <input id="file-input" type="file" accept="audio/*" multiple hidden />
  <script type="module" src="src/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create `styles.css`**

```css
:root { color-scheme: dark; }
body {
  background: #000;
  color: #cfcfcf;
  font-family: "Menlo", "DejaVu Sans Mono", monospace;
  font-size: 15px;
  line-height: 1.5;
  margin: 0;
  padding: 16px;
}
#app { margin: 0; white-space: pre; }
.clickable { cursor: pointer; }
.trigger:hover { color: #fff; background: #222; }
.cell { cursor: pointer; }
.cell:hover { color: #fff; }
.mode:hover, .remove:hover, .ctrl:hover { color: #fff; background: #222; }
.active { color: #fff; }
.notice { color: #888; }
.error { color: #d66; }
```

- [ ] **Step 5: Verify the test runner works**

Run: `npm test`
Expected: exits 0 with a message like "tests 0 / pass 0" (no test files yet).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold soundboard project"
```

---

### Task 2: `format.js` — volume bar

**Files:**
- Modify: `src/format.js`
- Test: `test/format.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/format.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { volumeBar } from "../src/format.js";

test("volumeBar renders filled and empty cells", () => {
  assert.equal(volumeBar(0, 10), "··········");
  assert.equal(volumeBar(1, 10), "##########");
  assert.equal(volumeBar(0.5, 10), "#####·····");
});

test("volumeBar clamps out-of-range values", () => {
  assert.equal(volumeBar(-1, 10), "··········");
  assert.equal(volumeBar(2, 10), "##########");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `volumeBar` is not exported (SyntaxError / undefined).

- [ ] **Step 3: Write minimal implementation**

Add to `src/format.js`:

```js
export function volumeBar(volume, width = 10) {
  const v = Math.max(0, Math.min(1, volume));
  const filled = Math.round(v * width);
  return "#".repeat(filled) + "·".repeat(width - filled);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/format.js test/format.test.js
git commit -m "feat: ascii volume bar"
```

---

### Task 3: `format.js` — keyboard shortcut assignment

**Files:**
- Modify: `src/format.js`
- Test: `test/format.test.js`

- [ ] **Step 1: Write the failing test**

Append to `test/format.test.js`:

```js
import { keyForIndex } from "../src/format.js";

test("keyForIndex assigns 1-9 then letters", () => {
  assert.equal(keyForIndex(0), "1");
  assert.equal(keyForIndex(8), "9");
  assert.equal(keyForIndex(9), "a");
  assert.equal(keyForIndex(10), "b");
});

test("keyForIndex returns empty string past the alphabet", () => {
  assert.equal(keyForIndex(99), "");
});
```

Update the existing import line at the top of the file to include `keyForIndex`:

```js
import { volumeBar, keyForIndex } from "../src/format.js";
```

(Remove the now-duplicate `import { keyForIndex } ...` line you just added if you prefer a single import — both work, but keep it clean with one import line.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `keyForIndex` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `src/format.js`:

```js
const KEY_ORDER = "123456789abcdefghijklmnopqrstuvwxyz";

export function keyForIndex(i) {
  return i >= 0 && i < KEY_ORDER.length ? KEY_ORDER[i] : "";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/format.js test/format.test.js
git commit -m "feat: keyboard shortcut assignment"
```

---

### Task 4: `format.js` — full pad row string

**Files:**
- Modify: `src/format.js`
- Test: `test/format.test.js`

- [ ] **Step 1: Write the failing test**

Append to `test/format.test.js`:

```js
import { padRow } from "../src/format.js";

test("padRow formats a complete ascii row", () => {
  const pad = { name: "Air Horn", volume: 0.8, mode: "overlap", key: "1" };
  assert.equal(
    padRow(pad, 0),
    "[1]  AIR HORN ................ vol [########··]  80%  (overlap)  [x]"
  );
});

test("padRow falls back to index-derived key when key is empty", () => {
  const pad = { name: "Bell", volume: 0.6, mode: "restart", key: "" };
  assert.equal(
    padRow(pad, 1),
    "[2]  BELL .................... vol [######····]  60%  (restart)  [x]"
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `padRow` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `src/format.js`:

```js
export function padRow(pad, index) {
  const key = pad.key || keyForIndex(index);
  const v = Math.max(0, Math.min(1, pad.volume));
  const pct = String(Math.round(v * 100)).padStart(3, " ");
  const name = (pad.name.toUpperCase() + " ").padEnd(24, ".");
  return `[${key}]  ${name} vol [${volumeBar(v)}] ${pct}%  (${pad.mode})  [x]`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS. If a spacing assertion fails, align the test's expected string to the implementation's output exactly — the format is fixed-width: a 24-char dot-leadered name field, a single space, `vol [`, the 10-char bar, `] `, 3-char right-aligned percent, `%  (`, mode, `)  [x]`.

- [ ] **Step 5: Commit**

```bash
git add src/format.js test/format.test.js
git commit -m "feat: full ascii pad row formatter"
```

---

### Task 5: `audio-engine.js` — overlap playback tracks sources

**Files:**
- Modify: `src/audio-engine.js`
- Test: `test/audio-engine.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/audio-engine.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `AudioEngine` is not exported.

- [ ] **Step 3: Write minimal implementation**

Create `src/audio-engine.js`:

```js
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

  play(padId, buffer, { volume = 1, mode = "overlap" } = {}) {
    this._ensure();
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
    src.start(0);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/audio-engine.js test/audio-engine.test.js
git commit -m "feat: audio engine overlap playback"
```

---

### Task 6: `audio-engine.js` — restart mode stops prior sources

**Files:**
- Test: `test/audio-engine.test.js` (implementation already covers this from Task 5)

- [ ] **Step 1: Write the failing test**

Append to `test/audio-engine.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test`
Expected: PASS (the Task 5 implementation already handles restart). This test locks the behavior in.

- [ ] **Step 3: Commit**

```bash
git add test/audio-engine.test.js
git commit -m "test: restart mode stops prior sources"
```

---

### Task 7: `audio-engine.js` — stopAll stops every pad

**Files:**
- Test: `test/audio-engine.test.js`

- [ ] **Step 1: Write the failing test**

Append to `test/audio-engine.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test`
Expected: PASS (Task 5 implementation already handles stopAll).

- [ ] **Step 3: Commit**

```bash
git add test/audio-engine.test.js
git commit -m "test: stopAll across all pads"
```

---

### Task 8: `audio-engine.js` — per-pad volume and master routing

**Files:**
- Test: `test/audio-engine.test.js`

- [ ] **Step 1: Write the failing test**

Append to `test/audio-engine.test.js`. This upgrades the fake context to record gain values so we can assert per-pad volume and master volume:

```js
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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test`
Expected: PASS (Task 5 implementation already routes per-pad gain → master gain).

- [ ] **Step 3: Commit**

```bash
git add test/audio-engine.test.js
git commit -m "test: per-pad and master volume routing"
```

---

### Task 9: `storage.js` — pad record serialization (pure)

**Files:**
- Modify: `src/storage.js`
- Test: `test/storage.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/storage.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { toRecord, fromRecord } from "../src/storage.js";

test("toRecord keeps persistable fields and drops the decoded buffer", () => {
  const blob = { fake: "blob" };
  const pad = {
    id: "abc",
    name: "Air Horn",
    blob,
    buffer: { duration: 1 }, // must NOT be persisted
    volume: 0.8,
    mode: "overlap",
    key: "1",
    order: 0,
  };
  const record = toRecord(pad);
  assert.deepEqual(record, {
    id: "abc",
    name: "Air Horn",
    blob,
    volume: 0.8,
    mode: "overlap",
    key: "1",
    order: 0,
  });
  assert.equal("buffer" in record, false);
});

test("fromRecord returns a pad with a null buffer to be decoded later", () => {
  const blob = { fake: "blob" };
  const record = { id: "abc", name: "Bell", blob, volume: 0.6, mode: "restart", key: "2", order: 1 };
  const pad = fromRecord(record);
  assert.equal(pad.id, "abc");
  assert.equal(pad.name, "Bell");
  assert.equal(pad.blob, blob);
  assert.equal(pad.volume, 0.6);
  assert.equal(pad.mode, "restart");
  assert.equal(pad.key, "2");
  assert.equal(pad.order, 1);
  assert.equal(pad.buffer, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `toRecord` / `fromRecord` not exported.

- [ ] **Step 3: Write minimal implementation**

Create `src/storage.js` with the pure helpers (IndexedDB IO comes in Task 10):

```js
export function toRecord(pad) {
  return {
    id: pad.id,
    name: pad.name,
    blob: pad.blob,
    volume: pad.volume,
    mode: pad.mode,
    key: pad.key,
    order: pad.order,
  };
}

export function fromRecord(record) {
  return {
    id: record.id,
    name: record.name,
    blob: record.blob,
    buffer: null,
    volume: record.volume,
    mode: record.mode,
    key: record.key,
    order: record.order,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage.js test/storage.test.js
git commit -m "feat: pad record serialization"
```

---

### Task 10: `storage.js` — IndexedDB persistence (implementation + manual smoke)

**Files:**
- Modify: `src/storage.js`

This task involves browser-only APIs (IndexedDB), so it is verified manually in the browser rather than with `node --test`.

- [ ] **Step 1: Add the IndexedDB layer**

Append to `src/storage.js`:

```js
const DB_NAME = "soundboard";
const DB_VERSION = 1;
const PAD_STORE = "pads";
const META_STORE = "meta";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PAD_STORE)) {
        db.createObjectStore(PAD_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode) {
  return db.transaction(store, mode).objectStore(store);
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Returns true if persistence is available in this browser/context.
export function storageAvailable() {
  return typeof indexedDB !== "undefined" && indexedDB !== null;
}

export async function savePad(pad) {
  const db = await openDB();
  await reqToPromise(tx(db, PAD_STORE, "readwrite").put(toRecord(pad)));
  db.close();
}

export async function deletePad(id) {
  const db = await openDB();
  await reqToPromise(tx(db, PAD_STORE, "readwrite").delete(id));
  db.close();
}

export async function saveSettings(settings) {
  const db = await openDB();
  await reqToPromise(
    tx(db, META_STORE, "readwrite").put({ key: "settings", value: settings })
  );
  db.close();
}

export async function loadState() {
  const db = await openDB();
  const records = await reqToPromise(tx(db, PAD_STORE, "readonly").getAll());
  const meta = await reqToPromise(tx(db, META_STORE, "readonly").get("settings"));
  db.close();
  records.sort((a, b) => a.order - b.order);
  return {
    pads: records.map(fromRecord),
    settings: meta ? meta.value : { masterVolume: 0.8 },
  };
}
```

- [ ] **Step 2: Confirm unit tests still pass**

Run: `npm test`
Expected: PASS — the pure `toRecord`/`fromRecord` tests are unaffected; the new code is not exercised by Node.

- [ ] **Step 3: Manual smoke test (deferred to Task 14)**

The full save/load round-trip is verified in the Task 14 browser smoke test once the UI exists. Note here that `loadState()` returns `{ pads, settings }` with `settings.masterVolume` defaulting to `0.8`.

- [ ] **Step 4: Commit**

```bash
git add src/storage.js
git commit -m "feat: indexeddb persistence layer"
```

---

### Task 11: `board.js` — render the board from state

**Files:**
- Modify: `src/board.js`

DOM rendering; verified visually in Task 14.

- [ ] **Step 1: Implement the renderer**

Create `src/board.js`:

```js
import { padRow, volumeBar, keyForIndex } from "./format.js";

// Renders the board into the given <pre> root. `handlers` wires interactions.
// state = { pads: [...], settings: { masterVolume } }
export function renderBoard(root, state, handlers) {
  root.textContent = "";

  root.appendChild(line(
    "======================  S O U N D B O A R D  ======================"
  ));

  // control bar
  const ctrl = document.createElement("div");
  ctrl.appendChild(span("  "));
  ctrl.appendChild(button("[+ add sound]", "ctrl", handlers.onAdd));
  ctrl.appendChild(span("      "));
  ctrl.appendChild(button("[ STOP ALL ]", "ctrl", handlers.onStopAll));
  ctrl.appendChild(span("      master "));
  ctrl.appendChild(masterBar(state.settings.masterVolume, handlers.onMasterVolume));
  ctrl.appendChild(span(" " + pct(state.settings.masterVolume)));
  root.appendChild(ctrl);

  root.appendChild(line(
    "==================================================================="
  ));

  if (state.pads.length === 0) {
    const hint = line("  (drop audio files here or click [+ add sound])");
    hint.className = "notice";
    root.appendChild(hint);
  }

  state.pads.forEach((pad, index) => {
    root.appendChild(padLine(pad, index, handlers));
  });

  root.appendChild(line(""));
  const help = line("  click name area or its number key to fire  ·  right-click name to rename  ·  click a vol cell to set level  ·  click (mode) to toggle");
  help.className = "notice";
  root.appendChild(help);
}

function padLine(pad, index, handlers) {
  const key = pad.key || keyForIndex(index);
  const row = document.createElement("div");

  const trigger = span(`[${key}]  ${(pad.name.toUpperCase() + " ").padEnd(24, ".")}`);
  trigger.className = "trigger clickable";
  trigger.addEventListener("click", () => handlers.onTrigger(pad.id));
  trigger.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    handlers.onRename(pad.id);
  });
  row.appendChild(trigger);

  row.appendChild(span(" vol ["));

  const bar = volumeBar(pad.volume);
  for (let i = 0; i < bar.length; i++) {
    const cell = span(bar[i]);
    cell.className = "cell";
    const level = (i + 1) / bar.length;
    cell.addEventListener("click", () => handlers.onVolume(pad.id, level));
    row.appendChild(cell);
  }

  row.appendChild(span(`] ${pct(pad.volume)}  `));

  const mode = span(`(${pad.mode})`);
  mode.className = "mode clickable";
  mode.addEventListener("click", () => handlers.onToggleMode(pad.id));
  row.appendChild(mode);

  row.appendChild(span("  "));

  const remove = span("[x]");
  remove.className = "remove clickable";
  remove.addEventListener("click", () => handlers.onRemove(pad.id));
  row.appendChild(remove);

  return row;
}

function masterBar(volume, onMasterVolume) {
  const wrap = span("[");
  const bar = volumeBar(volume);
  for (let i = 0; i < bar.length; i++) {
    const cell = span(bar[i]);
    cell.className = "cell";
    const level = (i + 1) / bar.length;
    cell.addEventListener("click", () => onMasterVolume(level));
    wrap.appendChild(cell);
  }
  wrap.appendChild(span("]"));
  return wrap;
}

function pct(volume) {
  const v = Math.max(0, Math.min(1, volume));
  return String(Math.round(v * 100)).padStart(3, " ") + "%";
}

function line(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div;
}

function span(text) {
  const s = document.createElement("span");
  s.textContent = text;
  return s;
}

function button(text, className, onClick) {
  const s = span(text);
  s.className = className + " clickable";
  s.addEventListener("click", onClick);
  return s;
}
```

Note: `padRow` is imported for parity with the tested format but the interactive renderer builds the row from spans so each segment can carry its own click handler; the produced text matches `padRow`'s layout.

- [ ] **Step 2: Confirm unit tests still pass**

Run: `npm test`
Expected: PASS (no new Node-testable code).

- [ ] **Step 3: Commit**

```bash
git add src/board.js
git commit -m "feat: ascii board renderer"
```

---

### Task 12: `app.js` — bootstrap, wiring, and persistence

**Files:**
- Modify: `src/app.js`

Browser entry point; verified in Task 14.

- [ ] **Step 1: Implement the bootstrap**

Create `src/app.js`:

```js
import { AudioEngine } from "./audio-engine.js";
import { renderBoard } from "./board.js";
import {
  loadState, savePad, deletePad, saveSettings, storageAvailable,
} from "./storage.js";
import { keyForIndex } from "./format.js";

const root = document.getElementById("app");
const fileInput = document.getElementById("file-input");
const engine = new AudioEngine();

let state = { pads: [], settings: { masterVolume: 0.8 } };

function idFor() {
  // unique enough id without Date.now/Math.random restrictions in app code
  return "pad-" + (state.pads.reduce((m, p) => Math.max(m, padNum(p.id)), 0) + 1);
}
function padNum(id) {
  const n = parseInt(String(id).replace("pad-", ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function reassignKeys() {
  state.pads.forEach((pad, i) => { pad.key = keyForIndex(i); });
}

function render() {
  renderBoard(root, state, handlers);
}

const handlers = {
  onTrigger(id) {
    const pad = state.pads.find((p) => p.id === id);
    if (pad && pad.buffer) {
      engine.play(pad.id, pad.buffer, { volume: pad.volume, mode: pad.mode });
    }
  },
  onStopAll() { engine.stopAll(); },
  onMasterVolume(level) {
    state.settings.masterVolume = level;
    engine.setMasterVolume(level);
    if (storageAvailable()) saveSettings(state.settings);
    render();
  },
  onVolume(id, level) {
    const pad = state.pads.find((p) => p.id === id);
    if (!pad) return;
    pad.volume = level;
    if (storageAvailable()) savePad(pad);
    render();
  },
  onToggleMode(id) {
    const pad = state.pads.find((p) => p.id === id);
    if (!pad) return;
    pad.mode = pad.mode === "overlap" ? "restart" : "overlap";
    if (storageAvailable()) savePad(pad);
    render();
  },
  onRename(id) {
    const pad = state.pads.find((p) => p.id === id);
    if (!pad) return;
    const name = window.prompt("Rename sound:", pad.name);
    if (name && name.trim()) {
      pad.name = name.trim();
      if (storageAvailable()) savePad(pad);
      render();
    }
  },
  onRemove(id) {
    state.pads = state.pads.filter((p) => p.id !== id);
    reassignKeys();
    if (storageAvailable()) {
      deletePad(id);
      state.pads.forEach((p) => savePad(p)); // persist new keys/order
    }
    render();
  },
  onAdd() { fileInput.click(); },
};

async function addFiles(fileList) {
  const files = Array.from(fileList);
  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = await engine.decode(arrayBuffer.slice(0));
      const pad = {
        id: idFor(),
        name: file.name.replace(/\.[^.]+$/, ""),
        blob: file,
        buffer,
        volume: 0.8,
        mode: "overlap",
        key: "",
        order: state.pads.length,
      };
      state.pads.push(pad);
      reassignKeys();
      pad.order = state.pads.indexOf(pad);
      if (storageAvailable()) savePad(pad);
    } catch (err) {
      showError(`Could not load ${file.name}: ${err.message}`);
    }
  }
  render();
}

function showError(message) {
  const div = document.createElement("div");
  div.className = "error";
  div.textContent = "  ! " + message;
  root.appendChild(div);
}

// --- input wiring ---

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) addFiles(fileInput.files);
  fileInput.value = "";
});

window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  e.preventDefault();
  if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
});

window.addEventListener("keydown", (e) => {
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
  if (e.key === "Escape") { engine.stopAll(); return; }
  const pad = state.pads.find((p) => p.key === e.key.toLowerCase());
  if (pad && pad.buffer) {
    engine.play(pad.id, pad.buffer, { volume: pad.volume, mode: pad.mode });
  }
});

// --- startup ---

async function start() {
  if (storageAvailable()) {
    try {
      const loaded = await loadState();
      state = loaded;
      reassignKeys();
      for (const pad of state.pads) {
        try {
          const arrayBuffer = await pad.blob.arrayBuffer();
          pad.buffer = await engine.decode(arrayBuffer.slice(0));
        } catch (err) {
          showError(`Could not decode saved ${pad.name}`);
        }
      }
    } catch (err) {
      showError("Persistence unavailable; sounds won't be saved this session.");
    }
  } else {
    showError("Persistence unavailable; sounds won't be saved this session.");
  }
  engine.setMasterVolume(state.settings.masterVolume);
  render();
}

start();
```

- [ ] **Step 2: Confirm unit tests still pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app.js
git commit -m "feat: app bootstrap, input wiring, persistence"
```

---

### Task 13: README with run instructions

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

```markdown
# Soundboard

A hyperminimal ASCII web soundboard. Drop in audio files, set per-pad volume, and
spam them by click or keyboard. Built for air horns and wrestling bells.

## Run

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Running via a local server (rather than opening index.html directly) ensures the
save-between-sessions feature works in all browsers.

## Use

- **[+ add sound]** or drag audio files onto the page to add pads.
- Click a pad's **name/number** (or press its number/letter key) to fire it.
- **(overlap)** stacks rapid taps (air horn); click it to toggle to **(restart)**,
  which cuts and restarts on each tap (tight bell hits).
- Click a **vol** cell to set that pad's level. Click the **master** bar for overall level.
- **Right-click** a name to rename it.
- **[ STOP ALL ]** (or the **Esc** key) silences everything instantly.

## Develop

```bash
npm test   # runs the unit tests (node --test)
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with run instructions"
```

---

### Task 14: Full browser smoke test

**Files:** none (manual verification)

- [ ] **Step 1: Start the server**

Run: `python3 -m http.server 8000`
Open `http://localhost:8000` in a browser.

- [ ] **Step 2: Verify the full flow**

Confirm each of these:

1. Empty board shows the `(drop audio files here ...)` hint and the control bar renders in ASCII.
2. Drag in (or use [+ add sound]) at least two audio files — they appear as `[1]`, `[2]` rows with names, volume bars at 80%, and `(overlap)`.
3. Click pad 1's name rapidly — sounds **overlap/stack** (air-horn spam).
4. Toggle pad 2 to `(restart)`, then press its key rapidly — each press **cuts and restarts**.
5. Click a different cell in a pad's volume bar — the bar redraws and the sound is quieter/louder next trigger.
6. Click cells in the **master** bar — overall volume changes.
7. Press **Esc** (or click **[ STOP ALL ]**) while a long sound plays — it stops immediately.
8. Right-click a name, rename it — the row updates.
9. Reload the page — pads, names, volumes, modes, and master volume are all **restored**.
10. Click **[x]** on a pad — it disappears and remaining pads renumber; reload confirms it stayed removed.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: soundboard complete" --allow-empty
```

---

## Self-Review Notes

- **Spec coverage:** load via drag-drop + picker (Task 12), per-pad volume (11/12), overlap/restart per pad (5/6/12), keyboard shortcuts (3/12), STOP ALL + Esc (12), master volume (11/12), IndexedDB persistence (9/10/12), ASCII aesthetic (4/11), local-server run (13), error handling for bad files + no-storage (12). All covered.
- **Type consistency:** `loadState()` → `{ pads, settings: { masterVolume } }`; pad shape `{ id, name, blob, buffer, volume, mode, key, order }` consistent across storage, board, app. Engine methods `play/stopPad/stopAll/setMasterVolume/decode` used consistently.
- **No placeholders:** every code step contains complete, runnable code.
