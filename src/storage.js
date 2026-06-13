export function toRecord(pad) {
  return {
    id: pad.id,
    name: pad.name,
    blob: pad.blob,
    volume: pad.volume,
    mode: pad.mode,
    key: pad.key,
    order: pad.order,
    start: pad.start ?? 0,
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
    start: record.start ?? 0,
  };
}

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
