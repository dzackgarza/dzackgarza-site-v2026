const HATCHER_AT = "https://pi.math.cornell.edu/~hatcher/AT/AT.pdf";
const CLIQUE_COMPLEX = "https://en.wikipedia.org/wiki/Clique_complex";
const CYCLOMATIC_NUMBER = "https://en.wikipedia.org/wiki/Cyclomatic_number";

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

function regularPolygonCoordinates(count, centerX, centerY, radius) {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
    return [centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)];
  });
}

function edge(a, b) {
  return a < b ? [a, b] : [b, a];
}

function edgeKey(a, b) {
  const [u, v] = edge(a, b);
  return `${u},${v}`;
}

function completeGraphEdges(order, offset = 0) {
  const edges = [];
  for (let i = 0; i < order; i += 1) {
    for (let j = i + 1; j < order; j += 1) {
      edges.push([offset + i, offset + j]);
    }
  }
  return edges;
}

function cycleEdges(order, offset = 0) {
  return Array.from({ length: order }, (_, index) => [offset + index, offset + ((index + 1) % order)]);
}

function completeBipartiteEdges(leftOrder, rightOrder) {
  const edges = [];
  for (let left = 0; left < leftOrder; left += 1) {
    for (let right = 0; right < rightOrder; right += 1) {
      edges.push([left, leftOrder + right]);
    }
  }
  return edges;
}

function graphSimplices(vertexCount, sourceEdges) {
  const vertices = Array.from({ length: vertexCount }, (_, index) => [index]);
  const edges = sourceEdges.map(([a, b]) => edge(a, b)).sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  const edgeSet = new Set(edges.map(([a, b]) => edgeKey(a, b)));
  const hasEdge = (a, b) => edgeSet.has(edgeKey(a, b));
  const triangles = [];
  const tetrahedra = [];

  for (let a = 0; a < vertexCount; a += 1) {
    for (let b = a + 1; b < vertexCount; b += 1) {
      for (let c = b + 1; c < vertexCount; c += 1) {
        if (hasEdge(a, b) && hasEdge(a, c) && hasEdge(b, c)) {
          triangles.push([a, b, c]);
        }
      }
    }
  }

  for (let a = 0; a < vertexCount; a += 1) {
    for (let b = a + 1; b < vertexCount; b += 1) {
      for (let c = b + 1; c < vertexCount; c += 1) {
        for (let d = c + 1; d < vertexCount; d += 1) {
          if (hasEdge(a, b) && hasEdge(a, c) && hasEdge(a, d) && hasEdge(b, c) && hasEdge(b, d) && hasEdge(c, d)) {
            tetrahedra.push([a, b, c, d]);
          }
        }
      }
    }
  }

  return [vertices, edges, triangles, tetrahedra];
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

const completeBipartitePoints = pointsFromCoordinates([
  [0.27, 0.32],
  [0.27, 0.68],
  [0.76, 0.2],
  [0.76, 0.5],
  [0.76, 0.8],
]);

const disjointCyclePoints = pointsFromCoordinates([
  ...regularPolygonCoordinates(4, 0.31, 0.5, 0.2),
  ...regularPolygonCoordinates(5, 0.72, 0.5, 0.21),
]);

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

const k23Simplices = graphSimplices(5, completeBipartiteEdges(2, 3));
const disjointCycleSimplices = graphSimplices(9, [...cycleEdges(4), ...cycleEdges(5, 4)]);

export const HOMOLOGY_FIXTURES = [
  {
    id: "circle-s1",
    label: "S¹ = X(C₄)",
    displayTex: "S^1=X(C_4)",
    texLabel: "S^1",
    type: "simplicial",
    expected: ["Z", "Z", "0"],
    expectedCells: [4, 4, 0, 0],
    oracleTex: "\\beta_1=1,\\quad H_1 \\cong \\ZZ",
    threshold: 0.18,
    points: circlePoints,
    simplices: graphSimplices(4, cycleEdges(4)),
    source: {
      label: "Clique complex plus cyclomatic number",
      url: CYCLOMATIC_NUMBER,
    },
  },
  {
    id: "filled-triangle",
    label: "Δ² = X(K₃)",
    displayTex: "\\Delta^2=X(K_3)",
    texLabel: "\\Delta^2",
    type: "simplicial",
    expected: ["Z", "0", "0"],
    expectedCells: [3, 3, 1, 0],
    oracleTex: "\\widetilde H_*(X(K_3); \\ZZ)=0",
    threshold: 0.22,
    points: trianglePoints,
    simplices: graphSimplices(3, completeGraphEdges(3)),
    source: {
      label: "Clique complex of a complete graph",
      url: CLIQUE_COMPLEX,
    },
  },
  {
    id: "sphere-s2",
    label: "S² = ∂Δ³",
    displayTex: "S^2=\\partial\\Delta^3",
    texLabel: "S^2",
    type: "simplicial",
    expected: ["Z", "0", "Z"],
    expectedCells: [4, 6, 4, 0],
    oracleTex: "H_2(S^2; \\ZZ) \\cong \\ZZ",
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
    label: "B³ = Δ³ = X(K₄)",
    displayTex: "B^3=\\Delta^3=X(K_4)",
    texLabel: "B^3",
    type: "simplicial",
    expected: ["Z", "0", "0"],
    expectedCells: [4, 6, 4, 1],
    oracleTex: "\\widetilde H_*(X(K_4); \\ZZ)=0",
    threshold: 0.2,
    points: tetrahedronPoints,
    simplices: graphSimplices(4, completeGraphEdges(4)),
    source: {
      label: "Clique complex of a complete graph",
      url: CLIQUE_COMPLEX,
    },
  },
  {
    id: "rp2-cellular",
    label: "RP²",
    displayTex: "\\mathbb{RP}^2",
    texLabel: "\\mathbb{RP}^2",
    type: "chain",
    expected: ["Z", "Z/2", "0"],
    expectedCells: [1, 1, 1, 0],
    oracleTex: "d_2=[2],\\quad H_1 \\cong \\ZZ/2",
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
  {
    id: "k23-clique",
    label: "X(K₂,₃)",
    displayTex: "X(K_{2,3})",
    texLabel: "X(K_{2,3})",
    type: "simplicial",
    expected: ["Z", "Z^2", "0"],
    expectedCells: [5, 6, 0, 0],
    oracleTex: "\\beta_1=|E|-|V|+1=2",
    threshold: 0.2,
    points: completeBipartitePoints,
    simplices: k23Simplices,
    source: {
      label: "Cyclomatic number for a connected triangle-free graph",
      url: CYCLOMATIC_NUMBER,
    },
  },
  {
    id: "disjoint-cycles-clique",
    label: "X(C₄ ⊔ C₅)",
    displayTex: "X(C_4 \\sqcup C_5)",
    texLabel: "X(C_4 \\sqcup C_5)",
    type: "simplicial",
    expected: ["Z^2", "Z^2", "0"],
    expectedCells: [9, 9, 0, 0],
    oracleTex: "H_0\\cong\\ZZ^2,\\quad H_1\\cong\\ZZ^2",
    threshold: 0.18,
    points: disjointCyclePoints,
    simplices: disjointCycleSimplices,
    source: {
      label: "Components and cyclomatic number of a graph",
      url: CYCLOMATIC_NUMBER,
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
