import {
  advancePointCloud,
  buildRipsComplex,
  computeHomology,
  eulerCharacteristic,
  formatGroup,
  generatePointCloud,
} from "./homology.js";
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
let complex = buildRipsComplex(points, threshold);
let lastCompute = 0;

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
  els.density.textContent = complex.limited ? "Complex over budget" : "Exact complex";
}

function recomputeHomology() {
  updateCounts();
  if (complex.limited) {
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
  setStatus("Exact SNF");
}

function rebuildComplex(forceHomology = false) {
  complex = buildRipsComplex(points, threshold);
  updateCounts();
  if (forceHomology || performance.now() - lastCompute > 420) {
    lastCompute = performance.now();
    recomputeHomology();
  }
}

function resetCloud(count) {
  seed = (seed + 7919) >>> 0;
  points = generatePointCloud(count, seed);
  rebuildComplex(true);
}

const renderer = await createRenderer(els.stage);
updateControlLabels();
recomputeHomology();
renderer.draw(complex);

els.pointsInput.addEventListener("input", () => {
  resetCloud(Number(els.pointsInput.value));
  updateControlLabels();
});

els.thresholdInput.addEventListener("input", () => {
  threshold = Number(els.thresholdInput.value);
  updateControlLabels();
  rebuildComplex(true);
  renderer.draw(complex);
});

els.speedInput.addEventListener("input", () => {
  speed = Number(els.speedInput.value);
  updateControlLabels();
});

els.toggleMotion.addEventListener("click", () => {
  paused = !paused;
  els.toggleMotion.textContent = paused ? "Resume" : "Pause";
});

els.randomize.addEventListener("click", () => {
  resetCloud(points.length);
  renderer.draw(complex);
});

els.recompute.addEventListener("click", () => {
  rebuildComplex(true);
  renderer.draw(complex);
});

renderer.app.ticker.add((ticker) => {
  if (!paused && speed > 0) {
    advancePointCloud(points, ticker.deltaMS / 1000, speed);
    rebuildComplex(false);
  }
  renderer.draw(complex);
  els.fps.textContent = `${renderer.fps()} fps`;
});
