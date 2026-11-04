import { test } from "node:test";
import assert from "node:assert/strict";
import { compactQso, mergeQsos, parseADIF, rarityTier, summarizeQsls } from "./qslStats.js";

const ADIF = `ARRL Logbook of the World Status Report
<PROGRAMID:4>LoTW
<APP_LoTW_LASTQSL:19>2026-10-30 14:02:11
<eoh>
<CALL:5>K7ABC <BAND:3>20M <MODE:3>SSB <QSO_DATE:8>20261001 <TIME_ON:6>010203 <QSLRDATE:8>20261003 <DXCC:3>291 <COUNTRY:24>UNITED STATES OF AMERICA <STATE:2>OR <eor>
<CALL:4>HC8N <BAND:3>15M <MODE:4>MFSK <SUBMODE:3>FT4 <QSO_DATE:8>20261005 <TIME_ON:6>220000 <QSLRDATE:8>20261020 <DXCC:2>71 <COUNTRY:17>GALAPAGOS ISLANDS <GRIDSQUARE:4>EI49 <eor>
`;

const qso = (over) => ({
  call: "W1AW", band: "20M", mode: "SSB", qsoDate: "20261001", timeOn: "000000",
  qslDate: "20261002", dxcc: "291", country: "UNITED STATES OF AMERICA", state: "CT", grid: "",
  ...over,
});

test("ADIF parsing keeps the header separate from the records", () => {
  const { header, records } = parseADIF(ADIF);
  assert.equal(header.APP_LOTW_LASTQSL, "2026-10-30 14:02:11");
  assert.equal(records.length, 2);
  assert.equal(compactQso(records[1]).mode, "FT4");
  assert.equal(compactQso(records[0]).qslDate, "20261003");
});

test("a resent confirmation replaces its old copy", () => {
  const a = qso({});
  const merged = mergeQsos([a], [{ ...a, state: "MA" }, qso({ call: "K1ABC" })]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((q) => q.call === "W1AW").state, "MA");
});

test("only the first confirmation of a state or entity is new", () => {
  const summary = summarizeQsls([
    qso({ call: "A", state: "OR", qslDate: "20261001" }),
    qso({ call: "B", state: "OR", qslDate: "20261005" }),
    qso({ call: "C", dxcc: "71", country: "GALAPAGOS ISLANDS", state: "", qslDate: "20261003" }),
    qso({ call: "D", dxcc: "1", country: "CANADA", state: "BC", qslDate: "20261004" }),
  ]);
  assert.deepEqual(
    summary.recent.map((r) => [r.call, r.region, r.isNew]),
    [["B", "Oregon", false], ["D", "British Columbia", true], ["C", "Galapagos Islands", true], ["A", "Oregon", true]]
  );
  assert.equal(summary.entities, 3);
});

test("rare contacts are ranked by Club Log's Most Wanted list", () => {
  const summary = summarizeQsls(
    [
      qso({ dxcc: "71", country: "GALAPAGOS ISLANDS", state: "" }),
      qso({ dxcc: "339", country: "JAPAN", state: "", call: "JA1X" }),
      qso({ dxcc: "999", country: "PORTUGAL", state: "", call: "CT1X" }),
    ],
    { 71: 135, 339: 327 }
  );
  assert.deepEqual(summary.rare.map((r) => [r.name, r.rank, r.tier]), [["Galapagos Islands", 135, "Rare"], ["Japan", 327, null]]);
  assert.equal(rarityTier(12), "Most wanted");
  assert.equal(rarityTier(null), null);
});

test("Alaska and Hawaii count as states as well as entities", () => {
  const summary = summarizeQsls([qso({ dxcc: "6", country: "ALASKA", state: "AK" }), qso({ call: "X", state: "MT" })]);
  assert.deepEqual(summary.states.map((s) => [s.state, s.entity]).sort(), [["AK", true], ["MT", false]]);
  assert.deepEqual(summary.dx.map((d) => d.name), ["Alaska"]);
});

test("bands are listed long to short wavelength", () => {
  const summary = summarizeQsls([qso({ band: "10M" }), qso({ band: "40M", call: "X" }), qso({ band: "20M", call: "Y" })]);
  assert.deepEqual(summary.bands.map((b) => b.band), ["40M", "20M", "10M"]);
});
