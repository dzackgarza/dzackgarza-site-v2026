function pointsFromCoordinates(coordinates) {
  return coordinates.map(([x, y, z], id) => ({ id, x, y, z, vx: 0, vy: 0, vz: 0 }));
}

function clonePoints(points) {
  return points.map((point) => ({ ...point }));
}

function cloneSimplices(simplices) {
  return simplices.map((cells) => cells.map((simplex) => [...simplex]));
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

function ringCoordinates(count, center, radius, zAmplitude = 0.12) {
  return Array.from({ length: count }, (_, index) => {
    const theta = (2 * Math.PI * index) / count;
    return [
      center[0] + radius * Math.cos(theta),
      center[1] + radius * Math.sin(theta),
      center[2] + zAmplitude * Math.sin(2 * theta),
    ];
  });
}

const circlePoints = pointsFromCoordinates(ringCoordinates(6, [0.5, 0.5, 0.5], 0.28, 0.16));

const tetrahedronPoints = pointsFromCoordinates([
  [0.5, 0.5, 0.12],
  [0.16, 0.2, 0.76],
  [0.84, 0.2, 0.76],
  [0.5, 0.88, 0.76],
]);

const k33Points = pointsFromCoordinates([
  [0.23, 0.26, 0.32],
  [0.23, 0.74, 0.32],
  [0.23, 0.5, 0.82],
  [0.77, 0.18, 0.68],
  [0.77, 0.82, 0.68],
  [0.77, 0.5, 0.18],
]);

const disjointCyclePoints = pointsFromCoordinates([
  ...ringCoordinates(4, [0.33, 0.5, 0.32], 0.19, 0.07),
  ...ringCoordinates(5, [0.72, 0.5, 0.68], 0.2, 0.08),
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

export const FIXTURES_3D = [
  {
    id: "circle-c6",
    label: "S^1 = X(C_6)",
    displayTex: "S^1=X(C_6)",
    texLabel: "S^1",
    expected: ["Z", "Z", "0"],
    oracleTex: "\\beta_1=1,\\quad H_1\\cong\\ZZ",
    threshold: 0.24,
    points: circlePoints,
    simplices: graphSimplices(6, cycleEdges(6)),
  },
  {
    id: "sphere-boundary",
    label: "S^2 = partial Delta^3",
    displayTex: "S^2=\\partial\\Delta^3",
    texLabel: "S^2",
    expected: ["Z", "0", "Z"],
    oracleTex: "H_2(S^2;\\ZZ)\\cong\\ZZ",
    threshold: 0.34,
    points: tetrahedronPoints,
    simplices: tetrahedronBoundarySimplices,
  },
  {
    id: "ball-delta3",
    label: "B^3 = Delta^3 = X(K_4)",
    displayTex: "B^3=\\Delta^3=X(K_4)",
    texLabel: "B^3",
    expected: ["Z", "0", "0"],
    oracleTex: "\\widetilde H_*(\\Delta^3;\\ZZ)=0",
    threshold: 0.34,
    points: tetrahedronPoints,
    simplices: graphSimplices(4, completeGraphEdges(4)),
  },
  {
    id: "k33-clique",
    label: "X(K_{3,3})",
    displayTex: "X(K_{3,3})",
    texLabel: "X(K_{3,3})",
    expected: ["Z", "Z^4", "0"],
    oracleTex: "\\beta_1=|E|-|V|+1=4",
    threshold: 0.3,
    points: k33Points,
    simplices: graphSimplices(6, completeBipartiteEdges(3, 3)),
  },
  {
    id: "two-cycles",
    label: "X(C_4 sqcup C_5)",
    displayTex: "X(C_4\\sqcup C_5)",
    texLabel: "X(C_4\\sqcup C_5)",
    expected: ["Z^2", "Z^2", "0"],
    oracleTex: "H_0\\cong\\ZZ^2,\\quad H_1\\cong\\ZZ^2",
    threshold: 0.22,
    points: disjointCyclePoints,
    simplices: graphSimplices(9, [...cycleEdges(4), ...cycleEdges(5, 4)]),
  },
];

export function fixtureById(id) {
  const fixture = FIXTURES_3D.find((candidate) => candidate.id === id);
  if (fixture === undefined) {
    throw new Error(`unknown 3D homology fixture ${id}`);
  }
  return fixture;
}

export function complexFromFixture(fixture) {
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
    graphReduction: {
      removed: 0,
      vertices: simplices[0].map(([vertex]) => vertex),
    },
  };
}

export function reductionFromFixture(fixture) {
  const counts = fixture.simplices.map((cells) => cells.length);
  return {
    graphRemoved: 0,
    before: [...counts],
    after: [...counts],
  };
}
