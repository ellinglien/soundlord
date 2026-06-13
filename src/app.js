import { AudioEngine } from "./audio-engine.js";
import { renderBoard } from "./board.js";
import {
  loadState, savePad, deletePad, saveSettings, storageAvailable,
} from "./storage.js";
import { keyForIndex } from "./format.js";

const root = document.getElementById("app");
const fileInput = document.getElementById("file-input");
const engine = new AudioEngine();
engine.onActiveChange = (padId, isActive) => {
  const row = root.querySelector(`[data-pad-id="${padId}"]`);
  if (row) row.classList.toggle("playing", isActive);
};

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
  const taken = new Set(state.pads.filter((p) => p.userKey && p.key).map((p) => p.key));
  let cursor = 0;
  for (const pad of state.pads) {
    if (pad.userKey && pad.key) continue;
    let candidate = keyForIndex(cursor);
    while (candidate && taken.has(candidate)) {
      cursor++;
      candidate = keyForIndex(cursor);
    }
    pad.key = candidate;
    if (candidate) {
      taken.add(candidate);
      cursor++;
    }
  }
}

function durationFor(pad) {
  if (pad.end == null) return undefined;
  const start = pad.start ?? 0;
  const d = pad.end - start;
  return d > 0 ? d : undefined;
}

function render() {
  renderBoard(root, state, handlers);
}

const handlers = {
  onTrigger(id) {
    const pad = state.pads.find((p) => p.id === id);
    if (pad && pad.buffer) {
      engine.play(pad.id, pad.buffer, {
        volume: pad.volume,
        mode: pad.mode,
        offset: pad.start ?? 0,
        duration: durationFor(pad),
      });
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
    const next = { overlap: "restart", restart: "toggle", toggle: "overlap" };
    pad.mode = next[pad.mode] || "overlap";
    if (storageAvailable()) savePad(pad);
    render();
  },
  onSetStart(id) {
    const pad = state.pads.find((p) => p.id === id);
    if (!pad) return;
    const current = (pad.start ?? 0).toFixed(2);
    const input = window.prompt("Start sample at (seconds, e.g. 0.25):", current);
    if (input === null) return;
    const next = parseFloat(input);
    if (!Number.isFinite(next) || next < 0) return;
    pad.start = next;
    if (storageAvailable()) savePad(pad);
    render();
  },
  onSetKey(id) {
    const pad = state.pads.find((p) => p.id === id);
    if (!pad) return;
    const input = window.prompt(
      "Assign a key (single character; blank = auto):",
      pad.userKey ? pad.key : ""
    );
    if (input === null) return;
    const k = input.trim().toLowerCase();
    if (k === "") {
      pad.userKey = false;
      pad.key = "";
    } else {
      if (k.length !== 1) return;
      const conflict = state.pads.find((p) => p.id !== id && p.key === k);
      if (conflict) {
        // bump the conflicting pad off its key — it'll get auto-reassigned
        conflict.userKey = false;
        conflict.key = "";
      }
      pad.key = k;
      pad.userKey = true;
    }
    reassignKeys();
    if (storageAvailable()) state.pads.forEach((p) => savePad(p));
    render();
  },
  onSetEnd(id) {
    const pad = state.pads.find((p) => p.id === id);
    if (!pad) return;
    const current = pad.end == null ? "" : pad.end.toFixed(2);
    const input = window.prompt(
      "End sample at (seconds; blank = full length):",
      current
    );
    if (input === null) return;
    const trimmed = input.trim();
    if (trimmed === "") {
      pad.end = null;
    } else {
      const next = parseFloat(trimmed);
      if (!Number.isFinite(next) || next <= 0) return;
      pad.end = next;
    }
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
        userKey: false,
        order: state.pads.length,
        start: 0,
        end: null,
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
    engine.play(pad.id, pad.buffer, {
      volume: pad.volume,
      mode: pad.mode,
      offset: pad.start ?? 0,
      duration: durationFor(pad),
    });
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
