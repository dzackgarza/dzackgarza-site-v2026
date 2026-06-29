import { buildRipsComplex, computeHomology } from "../../persistent_homology_v2/src/homology.js";
import { createGpuAdjacencyBackend3D } from "./gpu-adjacency-3d.js";
import { FIXTURES_3D, complexFromFixture, fixtureById } from "./fixtures-3d.js";
import { advancePointCloud3D, generatePointCloud3D } from "./points-3d.js";
import { createRenderer3D } from "./renderer-3d.js";

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
  chain: document.querySelector("#chain-expression"),
  cohomology: document.querySelector("#cohomology-expression"),
  euler: document.querySelector("#euler"),
  snfTime: document.querySelector("#snf-time"),
  cellCount: document.querySelector("#cell-count"),
  gpuMode: document.querySelector("#gpu-mode"),
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

let seed = 20260630;
let points = generatePointCloud3D(Number(els.pointsInput.value), seed);
let threshold = Number(els.thresholdInput.value);
let speed = Number(els.speedInput.value);
let paused = false;
let activeFixture = null;
let lastCompute = 0;
let lastTopologyRefresh = 0;
const adjacencyBackend = createGpuAdjacencyBackend3D(128);
let complex = buildRipsComplex(points, threshold, { adjacencyBackend, includeHomology: true });
let topologyDirty = true;

await customElements.whenDefined("sl-select");
await customElements.whenDefined("sl-option");

for (const fixture of FIXTURES_3D) {
  const option = document.createElement("sl-option");
  option.setAttribute("value", fixture.id);
  option.textContent = fixture.label;
  els.fixtureSelect.appendChild(option);
}
els.fixtureSelect.value = FIXTURES_3D[0].id;
await els.fixtureSelect.updateComplete;

function setStatus(text, mode = "") {
  els.status.textContent = text;
  els.status.className = mode;
}

function renderMath(element, tex) {
  if (window.katex === undefined) {
    throw new Error("KaTeX failed to load before homology display rendering");
  }
  element.dataset.tex = tex;
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
  const terms = cohomologyGroupsFromHomology(groups).map(groupToTex).join(" \\rightarrow ");
  return `\\tau_{\\leq 2} H^*(${spaceTex}; \\ZZ) = ${terms}`;
}

function countExponent(count, dimension) {
  if (complex.limitedAt === "faces" && dimension >= 2) {
    return "?";
  }
  if (complex.limitedAt === "tetrahedra" && dimension >= 3) {
    return "?";
  }
  return count.toString();
}

function chainComplexExpression(counts) {
  const terms = counts.map((count, dimension) => `\\ZZ^{${countExponent(count, dimension)}}`);
  return `\\tau_{\\leq 3}\\operatorname{VR}_\\bullet(${spaceTex()}) = ${terms[0]} \\leftarrow ${terms[1]} \\leftarrow ${terms[2]} \\leftarrow ${terms[3]}`;
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
  return activeFixture?.texLabel ?? "X_t";
}

function cellCounts() {
  return complex.cellCounts === undefined ? complex.simplices.map((cells) => cells.length) : complex.cellCounts;
}

function updateControlLabels() {
  const count = points.length;
  if (count > Number(els.pointsInput.max)) {
    els.pointsInput.max = String(count);
  }
  els.pointsInput.value = String(count);
  els.pointsOutput.value = String(count);
  els.thresholdOutput.value = threshold.toFixed(3);
  els.speedOutput.value = speed.toFixed(2);
  els.gpuMode.textContent = adjacencyBackend.mode;
}

function updateCounts() {
  const counts = cellCounts();
  renderMath(els.chain, chainComplexExpression(counts));
  els.cellCount.textContent = counts.join(" / ");
  const chi = counts.reduce((total, count, dimension) => total + (dimension % 2 === 0 ? count : -count), 0);
  els.euler.textContent = chi.toLocaleString();
  if (activeFixture !== null) {
    els.density.textContent = "fixture complex";
    return;
  }
  const removed = complex.graphReduction?.removed;
  els.density.textContent = removed === undefined ? "3D adjacency" : `3D adjacency / ${removed} collapsed`;
}

function updateFixtureReadout(fixture, result) {
  if (fixture === null) {
    els.fixture.name.textContent = "Live cloud";
    els.fixture.oracle.textContent = "-";
    els.fixture.expected.textContent = "-";
    delete els.fixture.name.dataset.tex;
    delete els.fixture.oracle.dataset.tex;
    delete els.fixture.expected.dataset.tex;
    els.fixture.result.textContent = "-";
    els.fixture.result.className = "";
    return;
  }

  const expectedCohomology = cohomologyGroupsFromHomology(expectedHomologyGroups(fixture));
  const actualCohomology = cohomologyGroupsFromHomology(result.groups);
  const matches = groupListsEqual(expectedCohomology, actualCohomology);
  renderMath(els.fixture.name, fixture.displayTex);
  renderMath(els.fixture.oracle, fixture.oracleTex);
  renderMath(els.fixture.expected, cohomologyExpression(expectedHomologyGroups(fixture), fixture.texLabel));
  els.fixture.result.textContent = matches ? "Match" : "Mismatch";
  els.fixture.result.className = matches ? "is-pass" : "is-fail";
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
  const result = computeHomology(complex);
  renderMath(els.cohomology, cohomologyExpression(result.groups, spaceTex()));
  els.snfTime.textContent = `${Math.round(result.elapsedMs)} ms`;
  updateFixtureReadout(activeFixture, result);
  setStatus("Ready");
  return result;
}

function rebuildComplex(forceHomology = false) {
  if (activeFixture !== null) {
    topologyDirty = true;
    recomputeHomology();
    return;
  }
  const interval = speed > 0 && !paused ? 1800 : 500;
  const shouldCompute = forceHomology || performance.now() - lastCompute > interval;
  if (!shouldCompute) {
    return;
  }
  complex = buildRipsComplex(points, threshold, {
    adjacencyBackend,
    includeHomology: true,
    includeVisualFaces: true,
    includeVisualTetrahedra: true,
    visualSimplexBudget: 42000,
    homologySimplexBudget: 90000,
  });
  topologyDirty = true;
  lastCompute = performance.now();
  recomputeHomology();
}

function clearFixtureMode() {
  activeFixture = null;
  updateFixtureReadout(null, null);
}

function resetCloud(count) {
  clearFixtureMode();
  seed = (seed + 7919) >>> 0;
  points = generatePointCloud3D(count, seed);
  rebuildComplex(true);
  updateControlLabels();
}

function releaseFixtureToMotion() {
  points = points.map((point, index) => ({
    ...point,
    id: index,
    vx: point.vx === 0 ? 0.06 * (index % 2 === 0 ? 1 : -1) : point.vx,
    vy: point.vy === 0 ? 0.05 * (index % 3 === 0 ? -1 : 1) : point.vy,
    vz: point.vz === 0 ? 0.055 * (index % 4 < 2 ? 1 : -1) : point.vz,
  }));
  clearFixtureMode();
  rebuildComplex(true);
}

function loadSelectedFixture() {
  activeFixture = fixtureById(els.fixtureSelect.value);
  paused = true;
  els.toggleMotion.textContent = "Resume";
  complex = complexFromFixture(activeFixture);
  points = complex.points;
  threshold = complex.threshold;
  els.thresholdInput.value = String(threshold);
  updateControlLabels();
  recomputeHomology();
  topologyDirty = true;
  renderer.draw(complex, { topologyChanged: topologyDirty });
  topologyDirty = false;
}

const renderer = createRenderer3D(els.stage);
updateControlLabels();
recomputeHomology();
renderer.draw(complex, { topologyChanged: topologyDirty });
topologyDirty = false;

els.pointsInput.addEventListener("input", () => {
  resetCloud(Number(els.pointsInput.value));
});

els.thresholdInput.addEventListener("input", () => {
  clearFixtureMode();
  threshold = Number(els.thresholdInput.value);
  updateControlLabels();
  rebuildComplex(true);
});

els.speedInput.addEventListener("input", () => {
  speed = Number(els.speedInput.value);
  updateControlLabels();
});

els.toggleMotion.addEventListener("click", () => {
  if (activeFixture !== null && paused) {
    releaseFixtureToMotion();
    paused = false;
    els.toggleMotion.textContent = "Pause";
    updateControlLabels();
    return;
  }
  paused = !paused;
  els.toggleMotion.textContent = paused ? "Resume" : "Pause";
});

els.randomize.addEventListener("click", () => {
  resetCloud(points.length);
});

els.recompute.addEventListener("click", () => {
  rebuildComplex(true);
});

els.loadFixture.addEventListener("click", () => {
  loadSelectedFixture();
});

renderer.setFrameHandler((delta) => {
  if (activeFixture === null && !paused && speed > 0) {
    advancePointCloud3D(points, delta, speed);
    if (performance.now() - lastTopologyRefresh > 850) {
      rebuildComplex(false);
      lastTopologyRefresh = performance.now();
    }
  }
  renderer.draw(complex, { topologyChanged: topologyDirty });
  topologyDirty = false;
  els.fps.textContent = `${renderer.fps()} fps`;
});
