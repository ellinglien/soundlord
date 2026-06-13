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
