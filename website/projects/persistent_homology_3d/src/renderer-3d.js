import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const CUBE_SIZE = 6;
const HALF = CUBE_SIZE / 2;
const COLORS = {
  vertex: 0xf7f2e8,
  vertexCore: 0x60f3b2,
  edge: 0x57b8ff,
  face: 0xa993ff,
  tetrahedron: 0xffb84d,
  threshold: 0xffb84d,
  cube: 0xf7f2e8,
};

function pointToVector(point) {
  return new THREE.Vector3((point.x - 0.5) * CUBE_SIZE, (point.y - 0.5) * CUBE_SIZE, (point.z - 0.5) * CUBE_SIZE);
}

function cubeEdgeGeometry() {
  const corners = [
    [-HALF, -HALF, -HALF],
    [HALF, -HALF, -HALF],
    [HALF, HALF, -HALF],
    [-HALF, HALF, -HALF],
    [-HALF, -HALF, HALF],
    [HALF, -HALF, HALF],
    [HALF, HALF, HALF],
    [-HALF, HALF, HALF],
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  const positions = edges.flatMap(([a, b]) => [...corners[a], ...corners[b]]);
  return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
}

function updatePositionAttribute(geometry, vectors) {
  const existing = geometry.getAttribute("position");
  const length = vectors.length * 3;
  if (existing === undefined || existing.array.length !== length) {
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(length, 3).setUsage(THREE.DynamicDrawUsage));
  }

  const attribute = geometry.getAttribute("position");
  for (let index = 0; index < vectors.length; index += 1) {
    const offset = index * 3;
    attribute.array[offset] = vectors[index].x;
    attribute.array[offset + 1] = vectors[index].y;
    attribute.array[offset + 2] = vectors[index].z;
  }
  attribute.needsUpdate = true;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.sqrt(3) * HALF + 1);
}

function setIndex(geometry, indices) {
  geometry.setIndex(indices);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.sqrt(3) * HALF + 1);
}

function tetrahedronBoundaryIndices(tetrahedra, limit) {
  const indices = [];
  for (let index = 0; index < limit; index += 1) {
    const [a, b, c, d] = tetrahedra[index];
    indices.push(a, b, c, a, b, d, a, c, d, b, c, d);
  }
  return indices;
}

function updateInstances(mesh, vectors, radius) {
  const matrix = new THREE.Matrix4();
  const scale = new THREE.Vector3(radius, radius, radius);
  for (let index = 0; index < vectors.length; index += 1) {
    matrix.compose(vectors[index], new THREE.Quaternion(), scale);
    mesh.setMatrixAt(index, matrix);
  }
  mesh.count = vectors.length;
  mesh.instanceMatrix.needsUpdate = true;
}

export function createRenderer3D(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090b0a);
  scene.fog = new THREE.FogExp2(0x090b0a, 0.035);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 80);
  camera.position.set(7.8, 6.1, 8.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 5;
  controls.maxDistance = 18;
  controls.target.set(0, 0, 0);
  controls.update();

  scene.add(new THREE.AmbientLight(0xf7f2e8, 0.82));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(4, 7, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x60f3b2, 0.72);
  rimLight.position.set(-6, -2, -4);
  scene.add(rimLight);

  const cube = new THREE.LineSegments(
    cubeEdgeGeometry(),
    new THREE.LineBasicMaterial({ color: COLORS.cube, transparent: true, opacity: 0.24 }),
  );
  scene.add(cube);

  const thresholdMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: COLORS.threshold,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    128,
  );
  scene.add(thresholdMesh);

  const pointMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.08, 16, 8),
    new THREE.MeshStandardMaterial({
      color: COLORS.vertex,
      emissive: COLORS.vertexCore,
      emissiveIntensity: 0.42,
      roughness: 0.46,
      metalness: 0.08,
    }),
    128,
  );
  scene.add(pointMesh);

  const edgeGeometry = new THREE.BufferGeometry();
  const edgeLines = new THREE.LineSegments(
    edgeGeometry,
    new THREE.LineBasicMaterial({ color: COLORS.edge, transparent: true, opacity: 0.58 }),
  );
  scene.add(edgeLines);

  const faceGeometry = new THREE.BufferGeometry();
  const faces = new THREE.Mesh(
    faceGeometry,
    new THREE.MeshBasicMaterial({
      color: COLORS.face,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  scene.add(faces);

  const tetraGeometry = new THREE.BufferGeometry();
  const tetrahedra = new THREE.Mesh(
    tetraGeometry,
    new THREE.MeshBasicMaterial({
      color: COLORS.tetrahedron,
      transparent: true,
      opacity: 0.085,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  scene.add(tetrahedra);

  let frameHandler = () => {};
  let previousFrameTime = performance.now();
  let lastFpsTime = performance.now();
  let frames = 0;
  let fps = 0;

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) {
      throw new Error(`3D stage has invalid size ${width}x${height}`);
    }
    if (renderer.domElement.width !== Math.floor(width * renderer.getPixelRatio()) || renderer.domElement.height !== Math.floor(height * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function updateSimplexIndices(complex) {
    setIndex(edgeGeometry, complex.simplices[1].flat());

    const faceIndices = [];
    if (complex.limitedAt !== "faces") {
      const triangleLimit = Math.min(complex.simplices[2].length, 2600);
      for (let index = 0; index < triangleLimit; index += 1) {
        faceIndices.push(...complex.simplices[2][index]);
      }
    }
    setIndex(faceGeometry, faceIndices);

    if (complex.limitedAt === "tetrahedra") {
      setIndex(tetraGeometry, []);
      return;
    }
    const tetrahedronLimit = Math.min(complex.simplices[3].length, 520);
    setIndex(tetraGeometry, tetrahedronBoundaryIndices(complex.simplices[3], tetrahedronLimit));
  }

  function draw(complex, options = {}) {
    const topologyChanged = options.topologyChanged ?? true;
    const vectors = complex.points.map(pointToVector);
    const thresholdRadius = complex.threshold * CUBE_SIZE;
    updateInstances(thresholdMesh, vectors, thresholdRadius);
    updateInstances(pointMesh, vectors, 1);

    updatePositionAttribute(edgeGeometry, vectors);
    updatePositionAttribute(faceGeometry, vectors);
    updatePositionAttribute(tetraGeometry, vectors);

    if (topologyChanged) {
      updateSimplexIndices(complex);
    }
  }

  function animate() {
    const frameTime = performance.now();
    const delta = Math.min((frameTime - previousFrameTime) / 1000, 0.05);
    previousFrameTime = frameTime;
    resize();
    frameHandler(delta);
    controls.update();
    renderer.render(scene, camera);
    frames += 1;
    const now = performance.now();
    if (now - lastFpsTime >= 500) {
      fps = Math.round((frames * 1000) / (now - lastFpsTime));
      frames = 0;
      lastFpsTime = now;
    }
  }

  renderer.setAnimationLoop(animate);
  window.addEventListener("resize", resize);

  return {
    draw,
    fps: () => fps,
    setFrameHandler(handler) {
      frameHandler = handler;
    },
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      renderer.dispose();
    },
  };
}
