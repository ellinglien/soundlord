import { padRow, volumeBar, keyForIndex } from "./format.js";

// Renders the board into the given <pre> root. `handlers` wires interactions.
// state = { pads: [...], settings: { masterVolume } }
export function renderBoard(root, state, handlers) {
  root.textContent = "";

  root.appendChild(line(
    "=======================  S O U N D L O R D  ======================="
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
    "===================================================================="
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
