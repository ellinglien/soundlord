export function volumeBar(volume, width = 10) {
  const v = Math.max(0, Math.min(1, volume));
  const filled = Math.round(v * width);
  return "#".repeat(filled) + "·".repeat(width - filled);
}
