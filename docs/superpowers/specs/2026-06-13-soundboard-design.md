# Soundboard — Design Spec

**Date:** 2026-06-13
**Goal:** A hyperminimal, ASCII/text-styled local web soundboard for parties — load audio
samples, set per-sound volume, and spam buttons (air horn) or hit them repeatedly (wrestling
bell). Desktop/laptop, click or keyboard.

## Purpose & Success Criteria

- Drop in audio files, each becomes a triggerable pad.
- Rapid clicks/keypresses fire instantly with no lag (the air-horn-spam test).
- Per-pad volume control.
- Per-pad behavior: **overlap** (taps stack) or **restart** (taps cut & restart).
- Keyboard shortcuts so the board can be played two-handed (bell + horn).
- "Stop all" panic button kills every playing sound at once.
- Board persists between sessions (sounds + settings restored on reload).

## Aesthetic

HYPERminimal. Pure text / ASCII UI. Monospace font, brackets, ascii separators — no images,
no gradients, no rounded cards. Think terminal program rendered in a browser. Example pad row:

```
[1]  AIR HORN ............ vol [########··] 80%  (overlap)  [x]
[2]  WRESTLING BELL ...... vol [######····] 60%  (restart)  [x]
```

Header / controls rendered the same way:

```
======================  S O U N D B O A R D  ======================
  + add sound        [ STOP ALL ]        master [#######···] 70%
===================================================================
```

(Master volume included as part of the control bar — small addition, fits the panic-button row.)

## Tech Approach — Web Audio API (vanilla JS, no framework)

Plain `index.html` + a JS file. No build step. Web Audio API is the core decision: each file is
decoded once into an `AudioBuffer`; every trigger spawns a fresh `AudioBufferSourceNode` routed
through a per-pad `GainNode` (volume) → master `GainNode` → destination. This gives instant,
overlapping, low-latency playback — what makes spamming feel good. Regular `<audio>` elements
can't overlap cleanly and stutter under rapid fire, so they're rejected.

- **Overlap mode:** each trigger just starts a new source node; old ones keep playing.
- **Restart mode:** the pad tracks its currently-playing source(s); on a new trigger it stops
  them before starting a fresh one.
- **Stop all:** stop every tracked active source node across all pads immediately.

## Components (small, focused units)

1. **Audio engine** (`audio.js` or a module)
   - `loadSample(file) -> sampleId` — decode file into an AudioBuffer, store it.
   - `play(sampleId, {volume, mode})` — spawn source through gain; track for restart/stop-all.
   - `stopPad(sampleId)` — stop that pad's active sources (used by restart mode).
   - `stopAll()` — stop every active source.
   - `setMasterVolume(v)` / per-pad volume applied at trigger time.
   - Depends on: Web Audio API only.

2. **Board UI** (rendering + input)
   - Renders the ASCII pad list and control bar from state.
   - Handles: pad click, volume slider change, mode toggle, name edit, remove (x),
     add-sound button, drag-and-drop of files onto the page, keyboard triggers, stop-all.
   - Auto-assigns keyboard shortcuts to pads (1-9 then letters) and shows the key in the row.
   - Depends on: audio engine, storage.

3. **Storage** (IndexedDB)
   - Persists each sample's raw file bytes (Blob) + metadata (name, volume, mode, key,
     order) + master volume.
   - `saveAll(state)` / `loadAll() -> state` on startup.
   - IndexedDB (not localStorage) because audio blobs exceed localStorage limits.
   - Depends on: IndexedDB only.

## Data Model

```
Pad {
  id: string
  name: string          // editable
  blob: Blob            // original file bytes (persisted)
  buffer: AudioBuffer   // decoded, in-memory only (rebuilt from blob on load)
  volume: number        // 0..1, per pad
  mode: "overlap" | "restart"
  key: string           // keyboard shortcut, e.g. "1"
  order: number
}
Settings { masterVolume: number }
```

## Data Flow

- **Add:** drop/pick file → audio engine decodes → new Pad added to state → UI re-renders →
  storage persists blob + meta.
- **Trigger:** click/keypress → engine.play(pad) honoring pad volume + mode + master volume.
- **Adjust:** slider/toggle/name edit → update state → persist (no re-decode needed).
- **Startup:** storage.loadAll → for each pad, decode blob → buffer → render board.

## Error Handling

- Unsupported / undecodable file → show an inline ASCII error line for that file, skip it,
  don't break the board.
- IndexedDB unavailable (e.g. opened via `file://` in a strict browser) → app still works for
  the session, shows a one-line notice that saving is disabled. (Recommended launch via local
  server avoids this.)
- Empty board → show ASCII hint: `(drop audio files here or press + add sound)`.

## Running It

Static files. Launch with a local static server so IndexedDB + audio decoding work reliably
across browsers:

```
cd soundboard && python3 -m http.server 8000
# open http://localhost:8000
```

## Out of Scope (YAGNI)

- Mobile/touch-specific layout (desktop-only for now).
- Bundled/preloaded sample packs (user loads their own).
- Folder auto-import (drag-and-drop only).
- Recording, trimming, effects, sharing/export.

## Testing

- Audio engine logic (overlap vs restart source tracking, stop-all) — unit-testable by mocking
  the Web Audio nodes and asserting which sources are started/stopped.
- Storage round-trip — save state, load it, assert pads + settings match.
- Manual smoke test: load horn + bell, spam both, confirm overlap/restart/stop-all behave and
  the board survives a reload.
