export function volumeBar(volume, width = 10) {
  const v = Math.max(0, Math.min(1, volume));
  const filled = Math.round(v * width);
  return "#".repeat(filled) + "·".repeat(width - filled);
}

const KEY_ORDER = "123456789abcdefghijklmnopqrstuvwxyz";

export function keyForIndex(i) {
  return i >= 0 && i < KEY_ORDER.length ? KEY_ORDER[i] : "";
}
