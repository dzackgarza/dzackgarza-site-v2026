const HATCHER_AT = "https://pi.math.cornell.edu/~hatcher/AT/AT.pdf";

function pointsFromCoordinates(coordinates) {
  return coordinates.map(([x, y], id) => ({ id, x, y, vx: 0, vy: 0 }));
}

function clonePoints(points) {
  return points.map((point) => ({ ...point }));
}

function cloneSimplices(simplices) {
  return simplices.map((cells) => cells.map((simplex) => [...simplex]));
}

function cloneBoundary(boundary) {
  return {
    rows: boundary.rows,
    cols: boundary.cols,
    matrix: boundary.matrix.map((row) => [...row]),
  };
}

function graphReductionFor(simplices) {
  return {
    removed: 0,
    vertices: simplices[0].map(([vertex]) => vertex),
  };
}

const circlePoints = pointsFromCoordinates([
  [0.5, 0.13],
  [0.87, 0.5],
  [0.5, 0.87],
  [0.13, 0.5],
]);

const trianglePoints = pointsFromCoordinates([
  [0.5, 0.14],
  [0.85, 0.76],
  [0.15, 0.76],
]);

const tetrahedronPoints = pointsFromCoordinates([
  [0.5, 0.12],
  [0.84, 0.72],
  [0.16, 0.72],
  [0.5, 0.48],
]);

const diskPoints = pointsFromCoordinates([
  [0.22, 0.24],
  [0.78, 0.24],
  [0.78, 0.78],
  [0.22, 0.78],
]);

const circleSimplices = [
  [[0], [1], [2], [3]],
  [
    [0, 1],
    [1, 2],
    [2, 3],
    [0, 3],
  ],
  [],
  [],
];

const filledTriangleSimplices = [
  [[0], [1], [2]],
  [
    [0, 1],
    [0, 2],
    [1, 2],
  ],
  [[0, 1, 2]],
  [],
];

const tetrahedronBoundarySimplices = [
  [[0], [1], [2], [3]],
  [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ],
  [
    [0, 1, 2],
    [0, 1, 3],
    [0, 2, 3],
    [1, 2, 3],
  ],
  [],
];

const filledTetrahedronSimplices = [
  ...tetrahedronBoundarySimplices.slice(0, 3),
  [[0, 1, 2, 3]],
];

const projectivePlaneDisplay = [
  [[0], [1], [2], [3]],
  [
    [0, 1],
    [1, 2],
    [2, 3],
    [0, 3],
    [0, 2],
  ],
  [
    [0, 1, 2],
    [0, 2, 3],
  ],
  [],
];

export const HOMOLOGY_FIXTURES = [
  {
    id: "circle-s1",
    label: "Circle S1",
    type: "simplicial",
    expected: ["Z", "Z", "0"],
    threshold: 0.18,
    points: circlePoints,
    simplices: circleSimplices,
    source: {
      label: "Hatcher, Algebraic Topology, homology of spheres",
      url: HATCHER_AT,
    },
  },
  {
    id: "filled-triangle",
    label: "Filled 2-simplex",
    type: "simplicial",
    expected: ["Z", "0", "0"],
    threshold: 0.22,
    points: trianglePoints,
    simplices: filledTriangleSimplices,
    source: {
      label: "Contractibility of a simplex",
      url: HATCHER_AT,
    },
  },
  {
    id: "sphere-s2",
    label: "Sphere S2",
    type: "simplicial",
    expected: ["Z", "0", "Z"],
    threshold: 0.2,
    points: tetrahedronPoints,
    simplices: tetrahedronBoundarySimplices,
    source: {
      label: "Hatcher, Algebraic Topology, homology of spheres",
      url: HATCHER_AT,
    },
  },
  {
    id: "filled-tetrahedron",
    label: "Filled 3-simplex",
    type: "simplicial",
    expected: ["Z", "0", "0"],
    threshold: 0.2,
    points: tetrahedronPoints,
    simplices: filledTetrahedronSimplices,
    source: {
      label: "Contractibility of a simplex",
      url: HATCHER_AT,
    },
  },
  {
    id: "rp2-cellular",
    label: "RP2 cellular",
    type: "chain",
    expected: ["Z", "Z/2", "0"],
    threshold: 0.16,
    points: diskPoints,
    displaySimplices: projectivePlaneDisplay,
    cellCounts: [1, 1, 1, 0],
    boundaries: [
      { rows: 0, cols: 1, matrix: [] },
      { rows: 1, cols: 1, matrix: [[0]] },
      { rows: 1, cols: 1, matrix: [[2]] },
      { rows: 1, cols: 0, matrix: [[]] },
    ],
    source: {
      label: "Hatcher, Algebraic Topology, cellular homology of RPn",
      url: HATCHER_AT,
    },
  },
];

export function fixtureById(id) {
  const fixture = HOMOLOGY_FIXTURES.find((candidate) => candidate.id === id);
  if (fixture === undefined) {
    throw new Error(`unknown homology fixture ${id}`);
  }
  return fixture;
}

export function complexFromFixture(fixture) {
  if (fixture.type === "simplicial") {
    const simplices = cloneSimplices(fixture.simplices);
    return {
      points: clonePoints(fixture.points),
      threshold: fixture.threshold,
      adjacency: [],
      limited: false,
      limitedAt: "",
      simplices,
      homologyLimited: false,
      homologyLimitedAt: "",
      homologySimplices: cloneSimplices(fixture.simplices),
      graphReduction: graphReductionFor(simplices),
    };
  }

  if (fixture.type === "chain") {
    return {
      points: clonePoints(fixture.points),
      threshold: fixture.threshold,
      adjacency: [],
      limited: false,
      limitedAt: "",
      simplices: cloneSimplices(fixture.displaySimplices),
      homologyLimited: false,
      homologyLimitedAt: "",
      homologySimplices: null,
      graphReduction: { removed: 0, vertices: [] },
      cellCounts: [...fixture.cellCounts],
    };
  }

  throw new Error(`unknown fixture type ${fixture.type}`);
}

export function boundariesFromFixture(fixture) {
  if (fixture.type !== "chain") {
    throw new Error(`fixture ${fixture.id} does not carry explicit boundaries`);
  }
  return fixture.boundaries.map(cloneBoundary);
}

export function reductionFromFixture(fixture) {
  if (fixture.type === "simplicial") {
    const counts = fixture.simplices.map((cells) => cells.length);
    return {
      graphRemoved: 0,
      before: [...counts],
      after: [...counts],
    };
  }

  if (fixture.type === "chain") {
    return {
      graphRemoved: 0,
      before: [...fixture.cellCounts],
      after: [...fixture.cellCounts],
    };
  }

  throw new Error(`unknown fixture type ${fixture.type}`);
}
