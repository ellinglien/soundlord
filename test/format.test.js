import { test } from "node:test";
import assert from "node:assert/strict";
import { volumeBar, keyForIndex } from "../src/format.js";

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
