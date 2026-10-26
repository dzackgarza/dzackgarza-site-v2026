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
  stageShell: document.querySelector(".stage-shell"),
  stage: document.querySelector("#stage"),
  stageMenu: document.querySelector("#stage-menu"),
  stageMenuList: document.querySelector("#stage-menu-list"),
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
let stageMenuState = null;
const manualEdges = new Set();
const manualFaces = new Set();
const manualTetrahedra = new Set();

await customElements.whenDefined("sl-select");
await customElements.whenDefined("sl-option");
await customElements.whenDefined("sl-menu");
await customElements.whenDefined("sl-menu-item");

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

function clampUnit(value) {
  return Math.min(0.96, Math.max(0.04, value));
}

function simplexKey(simplex) {
  return [...simplex].sort((a, b) => a - b).join(",");
}

function simplexFromKey(key) {
  return key.split(",").map(Number);
}

function addManualSimplex(target, simplex) {
  target.add(simplexKey(simplex));
}

function manualSimplexOptions() {
  return {
    manualEdges: [...manualEdges].map(simplexFromKey),
    manualFaces: [...manualFaces].map(simplexFromKey),
    manualTetrahedra: [...manualTetrahedra].map(simplexFromKey),
  };
}

function clearManualSimplices() {
  manualEdges.clear();
  manualFaces.clear();
  manualTetrahedra.clear();
}

function addFaceBoundary(face) {
  addManualSimplex(manualEdges, [face[0], face[1]]);
  addManualSimplex(manualEdges, [face[0], face[2]]);
  addManualSimplex(manualEdges, [face[1], face[2]]);
}

function syncPointInput() {
  const count = points.length;
  if (count > Number(els.pointsInput.max)) {
    els.pointsInput.max = String(count);
  }
  if (count < Number(els.pointsInput.min)) {
    els.pointsInput.min = String(count);
  }
  els.pointsInput.value = String(count);
  els.pointsOutput.value = String(count);
}

function updateControlLabels() {
  syncPointInput();
  els.thresholdOutput.value = threshold.toFixed(3);
  els.speedOutput.value = speed.toFixed(2);
}

function updateCounts() {
  const counts = complex.cellCounts === undefined ? complex.simplices.map((cells) => cells.length) : complex.cellCounts;
  renderMath(els.chain, chainComplexExpression(counts));
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
  return `\\tau_{\\leq 3}\\operatorname{Sing}_\\bullet(${spaceTex()}) = ${terms[0]} \\leftarrow ${terms[1]} \\leftarrow ${terms[2]} \\leftarrow ${terms[3]}`;
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
    ...manualSimplexOptions(),
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
  clearManualSimplices();
  seed = (seed + 7919) >>> 0;
  points = generatePointCloud(count, seed);
  rebuildComplex(true);
}

function releaseFixtureToMotion() {
  const fixturePoints = points.map((point, index) => ({
    ...point,
    id: index,
    vx: point.vx === 0 ? 0.06 * (index % 2 === 0 ? 1 : -1) : point.vx,
    vy: point.vy === 0 ? 0.05 * (index % 3 === 0 ? -1 : 1) : point.vy,
  }));
  clearFixtureMode();
  points = fixturePoints;
  clearManualSimplices();
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
  clearManualSimplices();
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

function closeStageMenu() {
  els.stageMenu.hidden = true;
  stageMenuState = null;
}

function openStageMenu(event) {
  const point = renderer.clientToPoint(event.clientX, event.clientY);
  if (point === null) {
    return;
  }

  const shellBox = els.stageShell.getBoundingClientRect();
  stageMenuState = {
    clientX: event.clientX,
    clientY: event.clientY,
    point,
    face: faceAtPoint(point),
  };
  const fillItem = els.stageMenuList.querySelector('[value="fill-simplex"]');
  fillItem.disabled = stageMenuState.face === null;
  fillItem.textContent = stageMenuState.face === null ? "No fill" : "Fill 2-simplex";
  els.stageMenu.style.left = `${Math.min(shellBox.width - 190, Math.max(10, event.clientX - shellBox.left))}px`;
  els.stageMenu.style.top = `${Math.min(shellBox.height - 108, Math.max(10, event.clientY - shellBox.top))}px`;
  els.stageMenu.hidden = false;
}

function addPointAt(point) {
  clearFixtureMode();
  const id = points.length;
  points = [
    ...points,
    {
      id,
      x: clampUnit(point.x),
      y: clampUnit(point.y),
      vx: 0,
      vy: 0,
    },
  ];
  updateControlLabels();
  rebuildComplex(true);
  requestDraw();
}

function fillFace(face) {
  clearFixtureMode();
  addFaceBoundary(face);
  addManualSimplex(manualFaces, face);
  rebuildComplex(true);
  requestDraw();
}

function hasEdge(edgeSet, a, b) {
  return edgeSet.has(simplexKey([a, b]));
}

function signedArea(a, b, c) {
  return ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
}

function pointInTriangle(point, a, b, c) {
  const area = signedArea(a, b, c);
  if (Math.abs(area) < 1e-5) {
    return false;
  }
  const s = signedArea(point, b, c) / area;
  const t = signedArea(a, point, c) / area;
  const u = signedArea(a, b, point) / area;
  return s >= -1e-4 && t >= -1e-4 && u >= -1e-4;
}

function smallestContainingFace(point, requireBoundaryEdges) {
  const edgeSet = new Set(complex.simplices[1].map(simplexKey));
  let candidate = null;
  let candidateArea = Infinity;

  for (let a = 0; a < points.length; a += 1) {
    for (let b = a + 1; b < points.length; b += 1) {
      if (requireBoundaryEdges && !hasEdge(edgeSet, a, b)) {
        continue;
      }
      for (let c = b + 1; c < points.length; c += 1) {
        if (requireBoundaryEdges && (!hasEdge(edgeSet, a, c) || !hasEdge(edgeSet, b, c))) {
          continue;
        }
        const area = Math.abs(signedArea(points[a], points[b], points[c]));
        if (area >= candidateArea || !pointInTriangle(point, points[a], points[b], points[c])) {
          continue;
        }
        candidate = [a, b, c];
        candidateArea = area;
      }
    }
  }

  return candidate;
}

function faceAtPoint(point) {
  return smallestContainingFace(point, true);
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
  if (activeFixture !== null && paused) {
    releaseFixtureToMotion();
    paused = false;
    els.toggleMotion.textContent = "Pause";
    updateControlLabels();
    updateTickerState();
    requestDraw();
    return;
  }
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

renderer.canvas.addEventListener("click", (event) => {
  event.stopPropagation();
  openStageMenu(event);
});

renderer.canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  event.stopPropagation();
  openStageMenu(event);
});

els.stageMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

els.stageMenuList.addEventListener("sl-select", (event) => {
  const action = event.detail.item.value;
  const state = stageMenuState;
  closeStageMenu();
  if (state === null) {
    return;
  }
  if (action === "add-point") {
    addPointAt(state.point);
    return;
  }
  if (action === "fill-simplex" && state.face !== null) {
    fillFace(state.face);
  }
});

document.addEventListener("click", () => {
  closeStageMenu();
});

renderer.app.ticker.add((ticker) => {
  if (activeFixture === null && !paused && speed > 0) {
    advancePointCloud(points, Math.min(ticker.deltaMS, 50) / 1000, speed);
    if (performance.now() - lastTopologyRefresh > 350) {
      rebuildComplex(false);
      lastTopologyRefresh = performance.now();
    }
    renderer.draw(complex, { faces: false });
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
