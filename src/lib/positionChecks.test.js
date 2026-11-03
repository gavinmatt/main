import { test } from "node:test";
import assert from "node:assert/strict";
import { bearingDeg, isImpossibleJump, maxHearableNm } from "./positionChecks.js";

const RX = [48.415, -114.459];

test("radio horizon grows with altitude", () => {
  assert.ok(maxHearableNm(0) < 40);
  assert.ok(maxHearableNm("ground") < 40);
  assert.ok(maxHearableNm(5000) < 150);
  assert.ok(maxHearableNm(35000) > 280);
  assert.equal(maxHearableNm(undefined), Infinity);
});

test("jumps faster than any aircraft are impossible", () => {
  const t = 1_000_000;
  const a = { lat: RX[0], lon: RX[1], t };
  // 15 seconds later, 2 NM on: a normal airliner.
  assert.ok(!isImpossibleJump(a, { lat: RX[0] + 2 / 60, lon: RX[1], t: t + 15_000 }));
  // 15 seconds later, 100 NM away.
  assert.ok(isImpossibleJump(a, { lat: RX[0] + 100 / 60, lon: RX[1], t: t + 15_000 }));
  // The same fix resent, or the first fix of a plane, can't be judged.
  assert.ok(!isImpossibleJump(a, { lat: RX[0] + 1, lon: RX[1], t }));
  assert.ok(!isImpossibleJump(null, a));
});

test("bearings are compass degrees", () => {
  assert.ok(Math.abs(bearingDeg(...RX, RX[0] + 1, RX[1]) - 0) < 0.5);
  assert.ok(Math.abs(bearingDeg(...RX, RX[0], RX[1] + 1) - 90) < 1);
  assert.ok(Math.abs(bearingDeg(...RX, RX[0] - 1, RX[1]) - 180) < 0.5);
  assert.ok(Math.abs(bearingDeg(...RX, RX[0], RX[1] - 1) - 270) < 1);
});
