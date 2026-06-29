const ZERO = 0n;
const ONE = 1n;

function abs(value) {
  return value < ZERO ? -value : value;
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

export function buildRipsComplex(points, threshold, simplexBudget = 36000) {
  const thresholdSq = threshold * threshold;
  const n = points.length;
  const adjacency = Array.from({ length: n }, () => new Uint8Array(n));
  const vertices = Array.from({ length: n }, (_, i) => [i]);
  const edges = [];
  const triangles = [];
  const tetrahedra = [];

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (dx * dx + dy * dy <= thresholdSq) {
        adjacency[i][j] = 1;
        adjacency[j][i] = 1;
        edges.push([i, j]);
      }
    }
  }

  let limited = false;
  let limitedAt = "";
  for (const [i, j] of edges) {
    for (let k = j + 1; k < n; k += 1) {
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

  if (!limited) {
    for (const [i, j, k] of triangles) {
      for (let l = k + 1; l < n; l += 1) {
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
    points,
    threshold,
    adjacency,
    limited,
    limitedAt,
    simplices: [vertices, edges, triangles, tetrahedra],
  };
}

function key(simplex) {
  return simplex.join(",");
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
        throw new Error(`missing face ${key(face)}`);
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
    matrix[target][col] += factor * matrix[source][col];
  }
}

function multiplyRow(matrix, row, factor) {
  for (let col = 0; col < matrix[row].length; col += 1) {
    matrix[row][col] *= factor;
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
    row[target] += factor * row[source];
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
          const quotient = matrix[row][cursor] / matrix[cursor][cursor];
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
          const quotient = matrix[cursor][col] / matrix[cursor][cursor];
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
        product[row][col] += left[row][mid] * right[mid][col];
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

export function computeHomology(complex) {
  if (complex.limited) {
    return {
      limited: true,
      groups: [],
      ranks: [],
      elapsedMs: 0,
    };
  }

  const started = performance.now();
  const [vertices, edges, triangles, tetrahedra] = complex.simplices;
  const boundaries = [
    zeroBoundary(vertices.length),
    boundaryMatrix(vertices, edges),
    boundaryMatrix(edges, triangles),
    boundaryMatrix(triangles, tetrahedra),
  ];

  const h0 = homologyAt(boundaries[0], boundaries[1]);
  const h1 = homologyAt(boundaries[1], boundaries[2]);
  const h2 = homologyAt(boundaries[2], boundaries[3]);
  const elapsedMs = performance.now() - started;

  return {
    limited: false,
    groups: [h0, h1, h2],
    ranks: boundaries.slice(1).map((boundary) => smithNormalForm(boundary.matrix, boundary.rows, boundary.cols).rank),
    elapsedMs,
  };
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
