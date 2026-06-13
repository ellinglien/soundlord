# Soundlord

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
