import { test } from "node:test";
import assert from "node:assert/strict";
import { volumeBar, keyForIndex, padRow } from "../src/format.js";

test("volumeBar renders filled and empty cells", () => {
  assert.equal(volumeBar(0, 10), "··········");
  assert.equal(volumeBar(1, 10), "##########");
  assert.equal(volumeBar(0.5, 10), "#####·····");
});

test("volumeBar clamps out-of-range values", () => {
  assert.equal(volumeBar(-1, 10), "··········");
  assert.equal(volumeBar(2, 10), "##########");
});

test("keyForIndex assigns 1-9 then letters", () => {
  assert.equal(keyForIndex(0), "1");
  assert.equal(keyForIndex(8), "9");
  assert.equal(keyForIndex(9), "a");
  assert.equal(keyForIndex(10), "b");
});

test("keyForIndex returns empty string past the alphabet", () => {
  assert.equal(keyForIndex(99), "");
});

test("padRow formats a complete ascii row", () => {
  const pad = { name: "Air Horn", volume: 0.8, mode: "overlap", key: "1" };
  assert.equal(
    padRow(pad, 0),
    "[1]  AIR HORN ............... vol [########··]  80%  (overlap)  [x]"
  );
});

test("padRow falls back to index-derived key when key is empty", () => {
  const pad = { name: "Bell", volume: 0.6, mode: "restart", key: "" };
  assert.equal(
    padRow(pad, 1),
    "[2]  BELL ................... vol [######····]  60%  (restart)  [x]"
  );
});
