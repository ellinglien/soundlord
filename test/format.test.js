import { test } from "node:test";
import assert from "node:assert/strict";
import { volumeBar } from "../src/format.js";

test("volumeBar renders filled and empty cells", () => {
  assert.equal(volumeBar(0, 10), "··········");
  assert.equal(volumeBar(1, 10), "##########");
  assert.equal(volumeBar(0.5, 10), "#####·····");
});

test("volumeBar clamps out-of-range values", () => {
  assert.equal(volumeBar(-1, 10), "··········");
  assert.equal(volumeBar(2, 10), "##########");
});
