import {
  advancePointCloud,
  buildRipsComplex,
  computeHomology,
  computeHomologyFromBoundaries,
  generatePointCloud,
} from "./homology.js";
import {
  HOMOLOGY_FIXTURES,
  boundariesFromFixture,
  complexFromFixture,
  fixtureById,
  reductionFromFixture,
} from "./fixtures.js";
import { createGpuAdjacencyBackend } from "./gpu-adjacency.js";
import { createRenderer } from "./renderer.js";

const els = {
  stage: document.querySelector("#stage"),
  pointsInput: document.querySelector("#points-input"),
  pointsOutput: document.querySelector("#points-output"),
  thresholdInput: document.querySelector("#threshold-input"),
  thresholdOutput: document.querySelector("#threshold-output"),
  speedInput: document.querySelector("#speed-input"),
  speedOutput: document.querySelector("#speed-output"),
  toggleMotion: document.querySelector("#toggle-motion"),
  randomize: document.querySelector("#randomize"),
  recompute: document.querySelector("#recompute"),
  fixtureSelect: document.querySelector("#fixture-select"),
  loadFixture: document.querySelector("#load-fixture"),
  status: document.querySelector("#compute-status"),
  density: document.querySelector("#density-label"),
  fps: document.querySelector("#fps-label"),
  counts: {
    vertices: document.querySelector("#count-vertices"),
    edges: document.querySelector("#count-edges"),
    faces: document.querySelector("#count-faces"),
    tetrahedra: document.querySelector("#count-tetrahedra"),
  },
  cohomology: document.querySelector("#cohomology-expression"),
  euler: document.querySelector("#euler"),
  snfTime: document.querySelector("#snf-time"),
  fixture: {
    name: document.querySelector("#fixture-name"),
    oracle: document.querySelector("#fixture-oracle"),
    expected: document.querySelector("#fixture-expected"),
    result: document.querySelector("#fixture-result"),
  },
};

const KATEX_OPTIONS = {
  displayMode: false,
  throwOnError: false,
  macros: {
    "\\ZZ": "\\mathbb{Z}",
  },
};

let seed = 20260629;
let points = generatePointCloud(Number(els.pointsInput.value), seed);
let threshold = Number(els.thresholdInput.value);
let speed = Number(els.speedInput.value);
let paused = false;
const adjacencyBackend = createGpuAdjacencyBackend(96);
let complex = buildRipsComplex(points, threshold, { adjacencyBackend, includeHomology: true });
let lastCompute = 0;
let lastTopologyRefresh = 0;
let needsDraw = true;
let activeFixture = null;

await customElements.whenDefined("sl-select");
await customElements.whenDefined("sl-option");

for (const fixture of HOMOLOGY_FIXTURES) {
  const option = document.createElement("sl-option");
  option.setAttribute("value", fixture.id);
  option.textContent = fixture.label;
  els.fixtureSelect.appendChild(option);
}
els.fixtureSelect.value = HOMOLOGY_FIXTURES[0].id;
await els.fixtureSelect.updateComplete;

function setStatus(text, mode = "") {
  els.status.textContent = text;
  els.status.className = mode;
}

function updateControlLabels() {
  els.pointsOutput.value = String(points.length);
  els.thresholdOutput.value = threshold.toFixed(3);
  els.speedOutput.value = speed.toFixed(2);
}

function updateCounts() {
  const counts = complex.cellCounts === undefined ? complex.simplices.map((cells) => cells.length) : complex.cellCounts;
  els.counts.vertices.textContent = counts[0].toLocaleString();
  els.counts.edges.textContent = counts[1].toLocaleString();
  els.counts.faces.textContent = complex.limitedAt === "faces" ? "over budget" : counts[2].toLocaleString();
  els.counts.tetrahedra.textContent = complex.limited ? "over budget" : counts[3].toLocaleString();
  const chi = counts.reduce((total, count, dimension) => total + (dimension % 2 === 0 ? count : -count), 0);
  els.euler.textContent = chi.toLocaleString();
  if (activeFixture !== null) {
    els.density.textContent = activeFixture.type === "chain" ? "cellular chain" : "fixture complex";
    return;
  }
  const removed = complex.graphReduction?.removed;
  els.density.textContent = removed === undefined ? `${adjacencyBackend.mode} adjacency` : `${adjacencyBackend.mode} / ${removed} collapsed`;
}

function renderMath(element, tex) {
  if (window.katex === undefined) {
    throw new Error("KaTeX failed to load before homology display rendering");
  }
  window.katex.render(tex, element, KATEX_OPTIONS);
}

function groupToTex(group) {
  const pieces = [];
  if (group.freeRank === 1) {
    pieces.push("\\ZZ");
  } else if (group.freeRank > 1) {
    pieces.push(`\\ZZ^{${group.freeRank}}`);
  }
  for (const factor of group.torsion) {
    pieces.push(`\\ZZ/${factor.toString()}\\ZZ`);
  }
  return pieces.length === 0 ? "0" : pieces.join(" \\oplus ");
}

function cohomologyGroupsFromHomology(groups) {
  return groups.map((group, index) => ({
    freeRank: group.freeRank,
    torsion: index === 0 ? [] : [...(groups[index - 1]?.torsion ?? [])],
  }));
}

function cohomologyExpression(groups, spaceTex) {
  const summands = cohomologyGroupsFromHomology(groups).map(groupToTex).join(" \\oplus ");
  return `\\tau_{\\leq 2} H^*(${spaceTex}; \\ZZ) = ${summands}`;
}

function parseGroupText(text) {
  if (text === "0") {
    return { freeRank: 0, torsion: [] };
  }

  return text.split(/\s*\+\s*/).reduce(
    (group, piece) => {
      if (piece === "Z") {
        group.freeRank += 1;
        return group;
      }
      if (piece.startsWith("Z^")) {
        group.freeRank += Number(piece.slice(2));
        return group;
      }
      if (piece.startsWith("Z/")) {
        group.torsion.push(BigInt(piece.slice(2)));
        return group;
      }
      throw new Error(`unknown fixture group notation ${piece}`);
    },
    { freeRank: 0, torsion: [] },
  );
}

function expectedHomologyGroups(fixture) {
  return fixture.expected.map(parseGroupText);
}

function groupsEqual(left, right) {
  return (
    left.freeRank === right.freeRank &&
    left.torsion.length === right.torsion.length &&
    left.torsion.every((factor, index) => factor.toString() === right.torsion[index].toString())
  );
}

function groupListsEqual(left, right) {
  return left.length === right.length && left.every((group, index) => groupsEqual(group, right[index]));
}

function spaceTex() {
  return activeFixture?.texLabel ?? "X";
}

function updateFixtureReadout(fixture, result) {
  if (fixture === null) {
    els.fixture.name.textContent = "Live cloud";
    els.fixture.oracle.textContent = "-";
    els.fixture.expected.textContent = "-";
    els.fixture.result.textContent = "-";
    els.fixture.result.className = "";
    return;
  }

  const expectedCohomology = cohomologyGroupsFromHomology(expectedHomologyGroups(fixture));
  const actualCohomology = cohomologyGroupsFromHomology(result.groups);
  const matches = groupListsEqual(expectedCohomology, actualCohomology);
  els.fixture.name.textContent = fixture.label;
  els.fixture.oracle.textContent = fixture.oracle;
  renderMath(els.fixture.expected, cohomologyExpression(expectedHomologyGroups(fixture), fixture.texLabel));
  els.fixture.result.textContent = matches ? "Match" : "Mismatch";
  els.fixture.result.className = matches ? "is-pass" : "is-fail";
}

function computeActiveHomology() {
  if (activeFixture !== null && activeFixture.type === "chain") {
    return computeHomologyFromBoundaries(boundariesFromFixture(activeFixture), reductionFromFixture(activeFixture));
  }
  return computeHomology(complex);
}

function recomputeHomology() {
  updateCounts();
  if (complex.homologyLimited) {
    setStatus("Reduce density", "is-blocked");
    renderMath(els.cohomology, `\\tau_{\\leq 2} H^*(${spaceTex()}; \\ZZ) = \\text{not computed}`);
    els.snfTime.textContent = "-";
    updateFixtureReadout(activeFixture, { groups: [] });
    return null;
  }

  setStatus("Computing", "is-hot");
  const result = computeActiveHomology();
  renderMath(els.cohomology, cohomologyExpression(result.groups, spaceTex()));
  els.snfTime.textContent = `${Math.round(result.elapsedMs)} ms`;
  updateFixtureReadout(activeFixture, result);
  setStatus("Ready");
  return result;
}

function rebuildComplex(forceHomology = false) {
  if (activeFixture !== null) {
    recomputeHomology();
    return;
  }
  const homologyInterval = speed > 0 && !paused ? 1500 : 420;
  const shouldCompute = forceHomology || performance.now() - lastCompute > homologyInterval;
  complex = buildRipsComplex(points, threshold, {
    adjacencyBackend,
    includeHomology: shouldCompute,
    includeVisualFaces: shouldCompute,
    includeVisualTetrahedra: shouldCompute,
  });
  if (shouldCompute) {
    updateCounts();
  }
  if (shouldCompute) {
    lastCompute = performance.now();
    recomputeHomology();
  }
}

function clearFixtureMode() {
  activeFixture = null;
  updateFixtureReadout(null, null);
}

function resetCloud(count) {
  clearFixtureMode();
  seed = (seed + 7919) >>> 0;
  points = generatePointCloud(count, seed);
  rebuildComplex(true);
}

function updateTickerState() {
  const active = activeFixture === null && !paused && speed > 0;
  renderer.setAnimating(active);
  if (!active) {
    els.fps.textContent = "idle";
  }
}

function requestDraw() {
  needsDraw = true;
  if (paused || speed === 0) {
    renderer.draw(complex);
    needsDraw = false;
  }
}

function loadSelectedFixture() {
  activeFixture = fixtureById(els.fixtureSelect.value);
  paused = true;
  els.toggleMotion.textContent = "Resume";
  complex = complexFromFixture(activeFixture);
  points = complex.points;
  threshold = complex.threshold;
  els.pointsInput.value = String(points.length);
  els.thresholdInput.value = String(threshold);
  updateControlLabels();
  recomputeHomology();
  updateTickerState();
  renderer.draw(complex);
  needsDraw = false;
}

const renderer = await createRenderer(els.stage);
updateControlLabels();
recomputeHomology();
renderer.draw(complex);
needsDraw = false;
updateTickerState();

els.pointsInput.addEventListener("input", () => {
  resetCloud(Number(els.pointsInput.value));
  updateControlLabels();
  requestDraw();
});

els.thresholdInput.addEventListener("input", () => {
  clearFixtureMode();
  threshold = Number(els.thresholdInput.value);
  updateControlLabels();
  rebuildComplex(true);
  requestDraw();
});

els.speedInput.addEventListener("input", () => {
  speed = Number(els.speedInput.value);
  updateControlLabels();
  updateTickerState();
  requestDraw();
});

els.toggleMotion.addEventListener("click", () => {
  paused = !paused;
  els.toggleMotion.textContent = paused ? "Resume" : "Pause";
  updateTickerState();
});

els.randomize.addEventListener("click", () => {
  resetCloud(points.length);
  requestDraw();
});

els.recompute.addEventListener("click", () => {
  rebuildComplex(true);
  requestDraw();
});

els.loadFixture.addEventListener("click", () => {
  loadSelectedFixture();
});

renderer.app.ticker.add((ticker) => {
  if (activeFixture === null && !paused && speed > 0) {
    advancePointCloud(points, Math.min(ticker.deltaMS, 50) / 1000, speed);
    if (performance.now() - lastTopologyRefresh > 350) {
      rebuildComplex(false);
      lastTopologyRefresh = performance.now();
    }
    renderer.draw(complex, { faces: false, halos: false });
    needsDraw = false;
  }
  if (needsDraw) {
    renderer.draw(complex);
    needsDraw = false;
  }
  if (ticker.lastTime % 250 < ticker.deltaMS) {
    els.fps.textContent = `${renderer.fps()} fps`;
  }
});
