// Run with `npm test`. Each case is a callsign the receiver has actually heard.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  airlineFromFlight,
  callsignRaw,
  classifyNotability,
  heatmapTypes,
  isGarbledCallsign,
  isPrivateFlight,
  militaryBranch,
} from "./flightClassify.js";

const plane = (flight, extra = {}) => ({ flight, hex: "a12345", ...extra });

test("airline codes need a flight number after them", () => {
  const cases = {
    DAL1234: "Delta Air Lines",
    ASA567: "Alaska Airlines",
    SKW3301: "SkyWest Airlines",
    WJA276: "WestJet",
    WJ276: "WestJet",
    AC123: "Air Canada",
    FL881: "Flair Airlines",
    FE609: "Flair Airlines",
    AB3187: "ABX Air",
    QX2104: "Horizon Air",
    XAA1154: "American Airlines",
    // Word callsigns for operators that don't fly under their code.
    FENIX27: "Phoenix Air",
    // Word callsigns that only start with an airline's code.
    TORO01: "—",
  };
  for (const [cs, airline] of Object.entries(cases)) {
    assert.equal(airlineFromFlight(plane(cs)), airline, cs);
  }
});

test("registrations and custom callsigns are private", () => {
  for (const cs of [
    "N123AB", "N4139H", "110AX", "CFPCX", "CGABC", "CFPCX0", "GABCD", "DABCD", "HBABC",
    "T7MUSIC", "LN86TW", "T755J", "T777JG", "NCJ12", "MAVEN59", "FABCD", "B5999", "HI1234",
    "PHABC", "VHABC", "ZSABC",
  ]) {
    assert.ok(isPrivateFlight(plane(cs)), cs);
    assert.equal(airlineFromFlight(plane(cs)), "Private", cs);
  }
});

test("airline flights aren't mistaken for registrations", () => {
  for (const cs of ["DAL1234", "UAL88", "CFCO520", "JANET99", "JUMP1"]) {
    assert.ok(!isPrivateFlight(plane(cs)), cs);
  }
});

test("military branches", () => {
  const cases = {
    RCH402: "USAF",
    REACH12: "USAF",
    SPAR19: "USAF",
    SAM28000: "USAF",
    ENRGY21: "USAF (TANKER)",
    MAXX108: "USN",
    CFCO520: "RCAF",
    SNBD1: "RCAF",
    RRR1234: "RAF",
  };
  for (const [cs, branch] of Object.entries(cases)) {
    assert.equal(militaryBranch(plane(cs)), branch, cs);
  }
  // A US military airframe with a tactical callsign: say so, but don't guess the branch.
  assert.equal(militaryBranch(plane("GHOST11", { hex: "ae1234" })), "US MIL");
  assert.equal(militaryBranch(plane("DAL1234")), null);
});

test("fun badges", () => {
  assert.equal(classifyNotability(plane("JANET99")).label, "JANET");
  assert.equal(airlineFromFlight(plane("JANET99")), "Janet");
  assert.equal(classifyNotability(plane("JUMP1")).label, "SKYDIVE");
  assert.equal(classifyNotability(plane("NASA807")).label, "RESEARCH");
  assert.equal(airlineFromFlight(plane("NOAA42")), "NOAA");
  assert.equal(classifyNotability(plane("BOE123")).label, "Test Flight");
  assert.equal(classifyNotability(plane("N123AB", { category: "A7" })).label, "HELI");
  assert.equal(classifyNotability(plane("DAL1234", { squawk: "7700" })).label, "EMERGENCY");
  assert.equal(classifyNotability(plane("DAL1234")), null);
});

test("garbled callsigns count as no callsign", () => {
  for (const cs of ["N", "0", "1018", "7", "  1  "]) {
    assert.ok(isGarbledCallsign(cs), cs);
    assert.equal(callsignRaw(plane(cs)), "", cs);
    assert.equal(airlineFromFlight(plane(cs)), "Undetermined", cs);
  }
  for (const cs of ["N1", "DAL1", "110AX", "", "00000000"]) {
    assert.ok(!isGarbledCallsign(cs), cs);
  }
});

test("heatmap types are exclusive", () => {
  assert.deepEqual(heatmapTypes(plane("DAL1234")), ["all", "airline"]);
  assert.deepEqual(heatmapTypes(plane("N123AB")), ["all", "private"]);
  assert.deepEqual(heatmapTypes(plane("RCH402")), ["all", "military"]);
  assert.deepEqual(heatmapTypes(plane("N123AB", { category: "A7" })), ["all", "heli"]);
  assert.deepEqual(heatmapTypes(plane("JUMP1")), ["all", "skydive"]);
  // Unidentified planes are derived as "other" when the API reads the counts.
  assert.deepEqual(heatmapTypes(plane("")), ["all"]);
  assert.deepEqual(heatmapTypes(plane("1018")), ["all"]);
});
