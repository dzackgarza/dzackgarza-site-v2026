function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

export function generatePointCloud3D(count, seed) {
  const rng = makeRng(seed);
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    x: 0.08 + rng() * 0.84,
    y: 0.08 + rng() * 0.84,
    z: 0.08 + rng() * 0.84,
    vx: (rng() - 0.5) * 0.16,
    vy: (rng() - 0.5) * 0.16,
    vz: (rng() - 0.5) * 0.16,
  }));
}

export function advancePointCloud3D(points, seconds, speed) {
  if (speed === 0) {
    return;
  }
  for (const point of points) {
    point.x += point.vx * seconds * speed;
    point.y += point.vy * seconds * speed;
    point.z += point.vz * seconds * speed;
    if (point.x < 0.04 || point.x > 0.96) {
      point.vx *= -1;
      point.x = Math.min(0.96, Math.max(0.04, point.x));
    }
    if (point.y < 0.04 || point.y > 0.96) {
      point.vy *= -1;
      point.y = Math.min(0.96, Math.max(0.04, point.y));
    }
    if (point.z < 0.04 || point.z > 0.96) {
      point.vz *= -1;
      point.z = Math.min(0.96, Math.max(0.04, point.z));
    }
  }
}
