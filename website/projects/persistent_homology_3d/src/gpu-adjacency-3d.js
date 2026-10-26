export function createGpuAdjacencyBackend3D(maxPoints) {
  const GPUConstructor = typeof globalThis.GPU === "function" ? globalThis.GPU : globalThis.GPU?.GPU;
  if (typeof GPUConstructor !== "function") {
    throw new Error("GPU.js did not load");
  }

  const gpu = new GPUConstructor();
  const kernel = gpu
    .createKernel(function adjacency(xs, ys, zs, thresholdSq, count) {
      const row = this.thread.y;
      const col = this.thread.x;
      if (row >= count || col >= count || row === col) {
        return 0;
      }
      const dx = xs[row] - xs[col];
      const dy = ys[row] - ys[col];
      const dz = zs[row] - zs[col];
      return dx * dx + dy * dy + dz * dz <= thresholdSq ? 1 : 0;
    })
    .setOutput([maxPoints, maxPoints]);

  return {
    mode: gpu.mode ?? "gpu",
    compute(points, threshold) {
      if (points.length > maxPoints) {
        throw new Error(`GPU 3D adjacency backend supports at most ${maxPoints} points`);
      }
      const xs = new Float32Array(maxPoints);
      const ys = new Float32Array(maxPoints);
      const zs = new Float32Array(maxPoints);
      for (let index = 0; index < points.length; index += 1) {
        xs[index] = points[index].x;
        ys[index] = points[index].y;
        zs[index] = points[index].z;
      }

      const raw = kernel(xs, ys, zs, threshold * threshold, points.length);
      return Array.from({ length: points.length }, (_, row) => {
        const values = new Uint8Array(points.length);
        for (let col = 0; col < points.length; col += 1) {
          values[col] = raw[row][col] >= 0.5 ? 1 : 0;
        }
        return values;
      });
    },
  };
}
