import {
  advancePointCloud,
  buildRipsComplex,
  computeHomology,
  eulerCharacteristic,
  formatGroup,
  generatePointCloud,
} from "./homology.js";
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
  status: document.querySelector("#compute-status"),
  density: document.querySelector("#density-label"),
  fps: document.querySelector("#fps-label"),
  counts: {
    vertices: document.querySelector("#count-vertices"),
    edges: document.querySelector("#count-edges"),
    faces: document.querySelector("#count-faces"),
    tetrahedra: document.querySelector("#count-tetrahedra"),
  },
  homology: [
    document.querySelector("#h0"),
    document.querySelector("#h1"),
    document.querySelector("#h2"),
  ],
  euler: document.querySelector("#euler"),
  ranks: document.querySelector("#ranks"),
  snfTime: document.querySelector("#snf-time"),
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
  const [vertices, edges, faces, tetrahedra] = complex.simplices;
  els.counts.vertices.textContent = vertices.length.toLocaleString();
  els.counts.edges.textContent = edges.length.toLocaleString();
  els.counts.faces.textContent = complex.limitedAt === "faces" ? "over budget" : faces.length.toLocaleString();
  els.counts.tetrahedra.textContent = complex.limited ? "over budget" : tetrahedra.length.toLocaleString();
  els.euler.textContent = eulerCharacteristic(complex).toLocaleString();
  const removed = complex.graphReduction?.removed;
  els.density.textContent = removed === undefined ? `${adjacencyBackend.mode} adjacency` : `${adjacencyBackend.mode} / ${removed} collapsed`;
}

function recomputeHomology() {
  updateCounts();
  if (complex.homologyLimited) {
    setStatus("Reduce density", "is-blocked");
    for (const target of els.homology) {
      target.textContent = "not computed";
    }
    els.ranks.textContent = "- / - / -";
    els.snfTime.textContent = "-";
    return;
  }

  setStatus("Computing", "is-hot");
  const result = computeHomology(complex);
  result.groups.forEach((group, index) => {
    els.homology[index].textContent = formatGroup(group);
  });
  els.ranks.textContent = result.ranks.join(" / ");
  els.snfTime.textContent = `${Math.round(result.elapsedMs)} ms`;
  setStatus("Reduced SNF");
}

function rebuildComplex(forceHomology = false) {
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

function resetCloud(count) {
  seed = (seed + 7919) >>> 0;
  points = generatePointCloud(count, seed);
  rebuildComplex(true);
}

function updateTickerState() {
  const active = !paused && speed > 0;
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

renderer.app.ticker.add((ticker) => {
  if (!paused && speed > 0) {
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
