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
