const ZERO = 0;
const ONE = 1;

function abs(value) {
  return Math.abs(value);
}

function roundInteger(value) {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) > 1e-6) {
    throw new Error(`non-integral SNF entry ${value}`);
  }
  return rounded;
}

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

export function generatePointCloud(count, seed) {
  const rng = makeRng(seed);
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    x: 0.08 + rng() * 0.84,
    y: 0.08 + rng() * 0.84,
    vx: (rng() - 0.5) * 0.18,
    vy: (rng() - 0.5) * 0.18,
  }));
}

export function advancePointCloud(points, seconds, speed) {
  if (speed === 0) {
    return;
  }
  for (const point of points) {
    point.x += point.vx * seconds * speed;
    point.y += point.vy * seconds * speed;
    if (point.x < 0.04 || point.x > 0.96) {
      point.vx *= -1;
      point.x = Math.min(0.96, Math.max(0.04, point.x));
    }
    if (point.y < 0.04 || point.y > 0.96) {
      point.vy *= -1;
      point.y = Math.min(0.96, Math.max(0.04, point.y));
    }
  }
}

function buildCpuAdjacency(points, threshold) {
  const thresholdSq = threshold * threshold;
  const n = points.length;
  const adjacency = Array.from({ length: n }, () => new Uint8Array(n));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (dx * dx + dy * dy <= thresholdSq) {
        adjacency[i][j] = 1;
        adjacency[j][i] = 1;
      }
    }
  }
  return adjacency;
}

function closedNeighborhoodContained(adjacency, active, source, target) {
  if (!adjacency[source][target]) {
    return false;
  }
  for (let vertex = 0; vertex < adjacency.length; vertex += 1) {
    if (!active[vertex]) {
      continue;
    }
    if (vertex === source || adjacency[source][vertex]) {
      if (vertex !== target && !adjacency[target][vertex]) {
        return false;
      }
    }
  }
  return true;
}

function reduceDominatedVertices(adjacency) {
  const active = new Uint8Array(adjacency.length).fill(1);
  let removed = 0;
  let changed = true;

  while (changed) {
    changed = false;
    for (let source = 0; source < adjacency.length; source += 1) {
      if (!active[source]) {
        continue;
      }
      for (let target = 0; target < adjacency.length; target += 1) {
        if (source === target || !active[target]) {
          continue;
        }
        if (closedNeighborhoodContained(adjacency, active, source, target)) {
          active[source] = 0;
          removed += 1;
          changed = true;
          break;
        }
      }
    }
  }

  return {
    active,
    removed,
    vertices: Array.from({ length: adjacency.length }, (_, i) => i).filter((i) => active[i]),
  };
}

function enumerateFlagSimplices(adjacency, vertexIds, simplexBudget, includeFaces = true, includeTetrahedra = true) {
  const vertices = vertexIds.map((id) => [id]);
  const edges = [];
  const triangles = [];
  const tetrahedra = [];
  let limited = false;
  let limitedAt = "";

  for (let ai = 0; ai < vertexIds.length; ai += 1) {
    const i = vertexIds[ai];
    for (let bi = ai + 1; bi < vertexIds.length; bi += 1) {
      const j = vertexIds[bi];
      if (adjacency[i][j]) {
        edges.push([i, j]);
      }
    }
  }

  if (includeFaces) {
    for (let ai = 0; ai < vertexIds.length; ai += 1) {
      const i = vertexIds[ai];
      for (let bi = ai + 1; bi < vertexIds.length; bi += 1) {
        const j = vertexIds[bi];
        if (!adjacency[i][j]) {
          continue;
        }
        for (let ci = bi + 1; ci < vertexIds.length; ci += 1) {
          const k = vertexIds[ci];
          if (adjacency[i][k] && adjacency[j][k]) {
            triangles.push([i, j, k]);
            if (vertices.length + edges.length + triangles.length > simplexBudget) {
              limited = true;
              limitedAt = "faces";
              break;
            }
          }
        }
        if (limited) {
          break;
        }
      }
      if (limited) {
        break;
      }
    }
  }

  if (includeTetrahedra && !limited) {
    for (const [i, j, k] of triangles) {
      const start = vertexIds.findIndex((id) => id === k) + 1;
      for (let li = start; li < vertexIds.length; li += 1) {
        const l = vertexIds[li];
        if (adjacency[i][l] && adjacency[j][l] && adjacency[k][l]) {
          tetrahedra.push([i, j, k, l]);
          if (vertices.length + edges.length + triangles.length + tetrahedra.length > simplexBudget) {
            limited = true;
            limitedAt = "tetrahedra";
            break;
          }
        }
      }
      if (limited) {
        break;
      }
    }
  }

  return {
    limited,
    limitedAt,
    simplices: [vertices, edges, triangles, tetrahedra],
  };
}

function simplexKey(simplex) {
  return [...simplex].sort((a, b) => a - b).join(",");
}

function normalizeSimplex(simplex) {
  return [...simplex].sort((a, b) => a - b);
}

function facesOf(simplex) {
  return simplex.map((_, index) => simplex.slice(0, index).concat(simplex.slice(index + 1)));
}

function mergeSimplices(base, extras) {
  const merged = [...base];
  const seen = new Set(base.map(simplexKey));
  for (const simplex of extras) {
    const normalized = normalizeSimplex(simplex);
    const key = simplexKey(normalized);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(normalized);
    }
  }
  return merged;
}

function manualSimplices(options) {
  const tetrahedra = (options.manualTetrahedra ?? []).map(normalizeSimplex);
  const faces = [...(options.manualFaces ?? []).map(normalizeSimplex), ...tetrahedra.flatMap(facesOf)];
  const edges = [
    ...(options.manualEdges ?? []).map(normalizeSimplex),
    ...faces.flatMap(facesOf),
    ...tetrahedra.flatMap((simplex) => facesOf(simplex).flatMap(facesOf)),
  ];

  return {
    edges,
    faces,
    tetrahedra,
    hasManualCells: edges.length > 0 || faces.length > 0 || tetrahedra.length > 0,
  };
}

export function buildRipsComplex(points, threshold, options = {}) {
  const adjacency = options.adjacencyBackend?.compute(points, threshold) ?? buildCpuAdjacency(points, threshold);
  const manual = manualSimplices(options);
  const allVertices = Array.from({ length: points.length }, (_, i) => i);
  const visual = enumerateFlagSimplices(
    adjacency,
    allVertices,
    options.visualSimplexBudget ?? 36000,
    options.includeVisualFaces !== false,
    options.includeVisualTetrahedra !== false,
  );
  const visualSimplices = [
    visual.simplices[0],
    mergeSimplices(visual.simplices[1], manual.edges),
    mergeSimplices(visual.simplices[2], manual.faces),
    mergeSimplices(visual.simplices[3], manual.tetrahedra),
  ];
  const includeHomology = options.includeHomology !== false;
  const graphReduction = includeHomology && !manual.hasManualCells ? reduceDominatedVertices(adjacency) : null;
  const homology = includeHomology
    ? enumerateFlagSimplices(adjacency, graphReduction?.vertices ?? allVertices, options.homologySimplexBudget ?? 80000, true, true)
    : null;
  const homologySimplices =
    homology === null
      ? null
      : [
          homology.simplices[0],
          mergeSimplices(homology.simplices[1], manual.edges),
          mergeSimplices(homology.simplices[2], manual.faces),
          mergeSimplices(homology.simplices[3], manual.tetrahedra),
        ];

  return {
    points,
    threshold,
    adjacency,
    manualFaces: manual.faces,
    limited: visual.limited,
    limitedAt: visual.limitedAt,
    simplices: visualSimplices,
    homologyLimited: homology?.limited ?? false,
    homologyLimitedAt: homology?.limitedAt ?? "",
    homologySimplices,
    graphReduction,
  };
}

function key(simplex) {
  return simplex.join(",");
}

function boundaryData(simplices) {
  const indexByKey = simplices.map((cells) => new Map(cells.map((simplex, index) => [key(simplex), index])));
  const boundary = simplices.map(() => []);

  for (let dim = 1; dim < simplices.length; dim += 1) {
    boundary[dim] = simplices[dim].map((simplex) =>
      simplex.map((_, i) => {
        const face = simplex.slice(0, i).concat(simplex.slice(i + 1));
        const index = indexByKey[dim - 1].get(key(face));
        if (index === undefined) {
          throw new Error(`missing face ${key(face)}`);
        }
        return { index, sign: i % 2 === 0 ? ONE : -ONE };
      }),
    );
  }

  return boundary;
}

function coreduceSimplices(simplices) {
  const boundary = boundaryData(simplices);
  const active = simplices.map((cells) => new Uint8Array(cells.length).fill(1));
  const cofaces = simplices.slice(0, -1).map((cells) => cells.map(() => []));
  const queue = [];

  for (let dim = 1; dim < simplices.length; dim += 1) {
    boundary[dim].forEach((faces, upper) => {
      for (const face of faces) {
        cofaces[dim - 1][face.index].push(upper);
      }
    });
  }

  function uniqueActiveCoface(dim, index) {
    let count = 0;
    let last = -1;
    for (const coface of cofaces[dim][index]) {
      if (active[dim + 1][coface]) {
        count += 1;
        last = coface;
        if (count > 1) {
          return -1;
        }
      }
    }
    return count === 1 ? last : -1;
  }

  function queueIfFree(dim, index) {
    if (dim >= cofaces.length || !active[dim][index]) {
      return;
    }
    if (uniqueActiveCoface(dim, index) !== -1) {
      queue.push([dim, index]);
    }
  }

  function removeSimplex(dim, index) {
    if (!active[dim][index]) {
      return;
    }
    active[dim][index] = 0;
    if (dim === 0) {
      return;
    }
    for (const face of boundary[dim][index]) {
      queueIfFree(dim - 1, face.index);
    }
  }

  for (let dim = 0; dim < cofaces.length; dim += 1) {
    for (let index = 0; index < simplices[dim].length; index += 1) {
      queueIfFree(dim, index);
    }
  }

  while (queue.length > 0) {
    const [dim, index] = queue.pop();
    if (!active[dim][index]) {
      continue;
    }
    const upper = uniqueActiveCoface(dim, index);
    if (upper === -1) {
      continue;
    }
    removeSimplex(dim + 1, upper);
    removeSimplex(dim, index);
  }

  const reduced = simplices.map((cells, dim) => cells.filter((_, index) => active[dim][index]));
  return {
    simplices: reduced,
    before: simplices.map((cells) => cells.length),
    after: reduced.map((cells) => cells.length),
  };
}

function boundaryMatrix(lower, upper) {
  const rowIndex = new Map(lower.map((simplex, index) => [key(simplex), index]));
  const rows = lower.length;
  const cols = upper.length;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(ZERO));

  for (let col = 0; col < upper.length; col += 1) {
    const simplex = upper[col];
    for (let i = 0; i < simplex.length; i += 1) {
      const face = simplex.slice(0, i).concat(simplex.slice(i + 1));
      const row = rowIndex.get(key(face));
      if (row === undefined) {
        throw new Error(`missing active face ${key(face)}`);
      }
      matrix[row][col] += i % 2 === 0 ? ONE : -ONE;
    }
  }

  return { matrix, rows, cols };
}

function zeroBoundary(cols) {
  return { matrix: [], rows: 0, cols };
}

function identity(size) {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => (row === col ? ONE : ZERO)),
  );
}

function cloneMatrix(matrix, rows, cols) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => matrix[row]?.[col] ?? ZERO),
  );
}

function swapRows(matrix, a, b) {
  if (a !== b) {
    [matrix[a], matrix[b]] = [matrix[b], matrix[a]];
  }
}

function addRows(matrix, target, source, factor) {
  if (factor === ZERO) {
    return;
  }
  for (let col = 0; col < matrix[target].length; col += 1) {
    matrix[target][col] = roundInteger(matrix[target][col] + factor * matrix[source][col]);
  }
}

function multiplyRow(matrix, row, factor) {
  for (let col = 0; col < matrix[row].length; col += 1) {
    matrix[row][col] = roundInteger(matrix[row][col] * factor);
  }
}

function swapCols(matrix, a, b) {
  if (a === b) {
    return;
  }
  for (const row of matrix) {
    [row[a], row[b]] = [row[b], row[a]];
  }
}

function addCols(matrix, target, source, factor) {
  if (factor === ZERO) {
    return;
  }
  for (const row of matrix) {
    row[target] = roundInteger(row[target] + factor * row[source]);
  }
}

function findPivot(matrix, startRow, startCol, rows, cols) {
  let best = null;
  for (let row = startRow; row < rows; row += 1) {
    for (let col = startCol; col < cols; col += 1) {
      const value = matrix[row][col];
      if (value !== ZERO && (best === null || abs(value) < abs(best.value))) {
        best = { row, col, value };
      }
    }
  }
  return best;
}

export function smithNormalForm(input, rows, cols, trackColumnInverse = false) {
  const matrix = cloneMatrix(input, rows, cols);
  const columnInverse = trackColumnInverse ? identity(cols) : null;
  let cursor = 0;

  while (cursor < rows && cursor < cols) {
    const pivot = findPivot(matrix, cursor, cursor, rows, cols);
    if (pivot === null) {
      break;
    }

    swapRows(matrix, cursor, pivot.row);
    swapCols(matrix, cursor, pivot.col);
    if (columnInverse) {
      swapRows(columnInverse, cursor, pivot.col);
    }

    while (true) {
      let changed = false;

      for (let row = cursor + 1; row < rows; row += 1) {
        if (matrix[row][cursor] !== ZERO) {
          const quotient = Math.trunc(matrix[row][cursor] / matrix[cursor][cursor]);
          addRows(matrix, row, cursor, -quotient);
          if (matrix[row][cursor] !== ZERO) {
            swapRows(matrix, row, cursor);
          }
          changed = true;
          break;
        }
      }
      if (changed) {
        continue;
      }

      for (let col = cursor + 1; col < cols; col += 1) {
        if (matrix[cursor][col] !== ZERO) {
          const quotient = Math.trunc(matrix[cursor][col] / matrix[cursor][cursor]);
          addCols(matrix, col, cursor, -quotient);
          if (columnInverse) {
            addRows(columnInverse, cursor, col, quotient);
          }
          if (matrix[cursor][col] !== ZERO) {
            swapCols(matrix, col, cursor);
            if (columnInverse) {
              swapRows(columnInverse, col, cursor);
            }
          }
          changed = true;
          break;
        }
      }
      if (changed) {
        continue;
      }

      let offender = null;
      for (let row = cursor + 1; row < rows && offender === null; row += 1) {
        for (let col = cursor + 1; col < cols; col += 1) {
          if (matrix[row][col] % matrix[cursor][cursor] !== ZERO) {
            offender = { row, col };
            break;
          }
        }
      }

      if (offender) {
        addRows(matrix, cursor, offender.row, ONE);
        continue;
      }

      break;
    }

    if (matrix[cursor][cursor] < ZERO) {
      multiplyRow(matrix, cursor, -ONE);
    }
    cursor += 1;
  }

  const diagonal = [];
  const limit = Math.min(rows, cols);
  for (let i = 0; i < limit; i += 1) {
    if (matrix[i][i] !== ZERO) {
      diagonal.push(abs(matrix[i][i]));
    }
  }

  return {
    diagonal,
    rank: diagonal.length,
    matrix,
    columnInverse,
  };
}

function multiplyMatrices(left, right, leftRows, shared, rightCols) {
  const product = Array.from({ length: leftRows }, () => Array(rightCols).fill(ZERO));
  for (let row = 0; row < leftRows; row += 1) {
    for (let mid = 0; mid < shared; mid += 1) {
      if (left[row][mid] === ZERO) {
        continue;
      }
      for (let col = 0; col < rightCols; col += 1) {
        product[row][col] = roundInteger(product[row][col] + left[row][mid] * right[mid][col]);
      }
    }
  }
  return product;
}

function homologyAt(boundaryDown, boundaryUp) {
  const down = smithNormalForm(boundaryDown.matrix, boundaryDown.rows, boundaryDown.cols, true);
  const kernelRank = boundaryDown.cols - down.rank;
  const transformedUp = multiplyMatrices(
    down.columnInverse,
    boundaryUp.matrix,
    boundaryDown.cols,
    boundaryDown.cols,
    boundaryUp.cols,
  );
  const imageInKernel = transformedUp.slice(down.rank);
  const image = smithNormalForm(imageInKernel, kernelRank, boundaryUp.cols, false);
  const torsion = image.diagonal.filter((entry) => entry > ONE);
  return {
    freeRank: kernelRank - image.rank,
    torsion,
    boundaryRank: down.rank,
    imageRank: image.rank,
  };
}

export function computeHomologyFromBoundaries(boundaries, reduction) {
  if (boundaries.length !== 4) {
    throw new Error(`expected four boundary operators, received ${boundaries.length}`);
  }

  const started = performance.now();
  const h0 = homologyAt(boundaries[0], boundaries[1]);
  const h1 = homologyAt(boundaries[1], boundaries[2]);
  const h2 = homologyAt(boundaries[2], boundaries[3]);
  const elapsedMs = performance.now() - started;

  return {
    limited: false,
    groups: [h0, h1, h2],
    ranks: [h0.imageRank, h1.imageRank, h2.imageRank],
    elapsedMs,
    reduction,
  };
}

export function computeHomology(complex) {
  if (complex.homologyLimited) {
    return {
      limited: true,
      groups: [],
      ranks: [],
      elapsedMs: 0,
      reduction: null,
    };
  }

  const source = complex.homologySimplices ?? complex.simplices;
  const reduction = coreduceSimplices(source);
  const [vertices, edges, triangles, tetrahedra] = reduction.simplices;
  const boundaries = [
    zeroBoundary(vertices.length),
    boundaryMatrix(vertices, edges),
    boundaryMatrix(edges, triangles),
    boundaryMatrix(triangles, tetrahedra),
  ];

  return computeHomologyFromBoundaries(boundaries, {
    graphRemoved: complex.graphReduction?.removed ?? 0,
    before: reduction.before,
    after: reduction.after,
  });
}

export function eulerCharacteristic(complex) {
  return complex.simplices.reduce(
    (total, simplices, dimension) => total + (dimension % 2 === 0 ? simplices.length : -simplices.length),
    0,
  );
}

export function formatGroup(group) {
  const pieces = [];
  if (group.freeRank === 1) {
    pieces.push("Z");
  } else if (group.freeRank > 1) {
    pieces.push(`Z^${group.freeRank}`);
  }
  for (const factor of group.torsion) {
    pieces.push(`Z/${factor.toString()}`);
  }
  return pieces.length === 0 ? "0" : pieces.join(" + ");
}
