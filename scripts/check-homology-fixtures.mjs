#!/usr/bin/env bun
import assert from "node:assert/strict";

import { HOMOLOGY_FIXTURES, boundariesFromFixture, complexFromFixture, reductionFromFixture } from "../content/projects/persistent_homology_v2/src/fixtures.js";
import {
  computeHomology,
  computeHomologyFromBoundaries,
  formatGroup,
} from "../content/projects/persistent_homology_v2/src/homology.js";

function computeFixtureHomology(fixture) {
  const complex = complexFromFixture(fixture);
  const cells = complex.cellCounts === undefined ? complex.simplices.map((simplices) => simplices.length) : complex.cellCounts;

  assert.deepEqual(
    cells,
    fixture.expectedCells,
    `${fixture.label} should realize clique/cell counts ${fixture.expectedCells.join(", ")}`,
  );

  if (fixture.type === "chain") {
    return computeHomologyFromBoundaries(boundariesFromFixture(fixture), reductionFromFixture(fixture));
  }
  if (fixture.type === "simplicial") {
    return computeHomology(complex);
  }
  throw new Error(`unknown fixture type ${fixture.type}`);
}

for (const fixture of HOMOLOGY_FIXTURES) {
  const result = computeFixtureHomology(fixture);
  const actual = result.groups.map(formatGroup);
  assert.deepEqual(
    actual,
    fixture.expected,
    `${fixture.label} should compute integral homology ${fixture.expected.join(", ")} from ${fixture.source.label}`,
  );
}

console.log(`Checked ${HOMOLOGY_FIXTURES.length} homology fixtures.`);
