import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

(function () {
  const worldCanvas = requireElement("world", HTMLCanvasElement);
  const squareCanvas = requireElement("playground", HTMLCanvasElement);
  const topologyControl = requireElement("topology", HTMLSelectElement);
  const rootsControl = requireElement("roots", HTMLInputElement);
  const colorControl = requireElement("pathColor", HTMLSelectElement);
  const trailStatus = requireElement("trailStatus", HTMLElement);
  const ctx = requireCanvasContext(squareCanvas);

  const STEP = 5;
  const MARKER_RADIUS = 5;
  const TRAIL_BREADCRUMB_SIZE = 4;
  const ROOT_RADIUS = 4;
  const DOMAIN_SIZE = 320;
  const MAX_ROOTS = 200;
  const TWO_PI = Math.PI * 2;
  const TORUS_RADIUS = 2.65;
  const TORUS_TUBE = 0.88;
  const TORUS_MARKER_RADIUS = 0.135;
  const TORUS_BREADCRUMB_RADIUS = 0.085;
  const ROOT_3D_RADIUS = 0.07;
  const STAR_COUNT = 900;

  const state = {
    x: 120,
    y: 120,
    width: DOMAIN_SIZE,
    height: DOMAIN_SIZE,
    trail: [],
    trailEnabled: false,
    pathColor: colorControl.value,
    topology: topologyControl.value,
    roots: parseRootCount(rootsControl.value)
  };

  const renderer = new THREE.WebGLRenderer({
    canvas: worldCanvas,
    antialias: true,
    alpha: false
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020309);
  scene.fog = new THREE.FogExp2(0x020309, 0.035);

  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 120);
  camera.position.set(7.2, 6.1, 6.8);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.34;
  controls.target.set(0, 0, 0);

  const rootGeometry = new THREE.SphereGeometry(ROOT_3D_RADIUS, 18, 14);
  const rootMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3f3f,
    toneMapped: false
  });
  const trailGeometry = new THREE.BoxGeometry(
    TORUS_BREADCRUMB_RADIUS,
    TORUS_BREADCRUMB_RADIUS,
    TORUS_BREADCRUMB_RADIUS
  );
  const trailMaterial = new THREE.MeshBasicMaterial({
    color: state.pathColor,
    toneMapped: false
  });
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: state.pathColor,
    toneMapped: false
  });
  const torusMaterial = new THREE.MeshStandardMaterial({
    map: createTorusTexture(),
    color: 0x6c83b8,
    roughness: 0.34,
    metalness: 0.18,
    emissive: 0x071a30,
    emissiveIntensity: 0.24
  });
  const rp2Material = new THREE.MeshStandardMaterial({
    color: 0xb86cff,
    roughness: 0.26,
    metalness: 0.12,
    emissive: 0x260a3d,
    emissiveIntensity: 0.36,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92
  });

  const surfaceMesh = new THREE.Mesh(createTorusGeometry(), torusMaterial);
  scene.add(surfaceMesh);

  const torusWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(surfaceMesh.geometry),
    new THREE.LineBasicMaterial({
      color: 0x8fcaff,
      transparent: true,
      opacity: 0.16
    })
  );
  torusWire.scale.setScalar(1.002);
  surfaceMesh.add(torusWire);

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(TORUS_MARKER_RADIUS, 28, 22),
    markerMaterial
  );
  marker.frustumCulled = false;
  scene.add(marker);

  const trailDots = [];
  const rootDots = [];
  const halo = createHalo();
  const stars = createStarField();
  scene.add(halo);
  scene.add(stars);

  addLights();
  assertProjectiveQuotientCompatibility();
  resize();
  syncAll();
  renderer.setAnimationLoop(render);

  function requireElement(id, type) {
    const element = document.getElementById(id);
    if (!(element instanceof type)) {
      throw new Error(`Required element #${id} is missing or has the wrong type.`);
    }
    return element;
  }

  function requireCanvasContext(canvas) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("The square overlay requires a 2D canvas context.");
    }
    return context;
  }

  function createTorusTexture() {
    const size = 1024;
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = size;
    textureCanvas.height = size;
    const context = requireCanvasContext(textureCanvas);
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#08101d");
    gradient.addColorStop(0.42, "#1b3760");
    gradient.addColorStop(0.58, "#06111f");
    gradient.addColorStop(1, "#6f90c8");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    context.globalCompositeOperation = "screen";
    for (let i = 0; i < 44; i++) {
      const y = (i / 44) * size;
      context.strokeStyle = i % 4 === 0 ? "rgba(115, 207, 255, 0.34)" : "rgba(115, 207, 255, 0.13)";
      context.lineWidth = i % 4 === 0 ? 2.2 : 1;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y);
      context.stroke();
      context.beginPath();
      context.moveTo(y, 0);
      context.lineTo(y, size);
      context.stroke();
    }

    context.strokeStyle = "rgba(255, 222, 128, 0.72)";
    context.lineWidth = 8;
    context.beginPath();
    context.arc(size * 0.5, size * 0.5, size * 0.16, 0, TWO_PI);
    context.stroke();

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  function createHalo() {
    const geometry = new THREE.TorusGeometry(TORUS_RADIUS * 1.13, 0.014, 12, 240);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff3f8d,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.set(0.35, -0.8, 0.1);
    return mesh;
  }

  function createStarField() {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const radius = 24 + Math.random() * 64;
      const theta = Math.random() * TWO_PI;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0x7acfff,
        size: 0.045,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    );
  }

  function addLights() {
    scene.add(new THREE.AmbientLight(0x9bb9ff, 0.64));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(5.5, 7, 4.5);
    scene.add(key);
    const rim = new THREE.PointLight(0x4fc3ff, 3.2, 30, 1.2);
    rim.position.set(-5, -2.5, 4);
    scene.add(rim);
    const magenta = new THREE.PointLight(0xff3f8d, 2.4, 24, 1.2);
    magenta.position.set(3.8, -4.2, -2.4);
    scene.add(magenta);
  }

  function createTorusGeometry() {
    return new THREE.TorusGeometry(TORUS_RADIUS, TORUS_TUBE, 128, 256);
  }

  function createRp2Geometry() {
    const widthSegments = 160;
    const heightSegments = 96;
    const positions = [];
    const indices = [];

    for (let y = 0; y <= heightSegments; y++) {
      for (let x = 0; x <= widthSegments; x++) {
        const point = projectiveImmersion(
          (x / widthSegments) * state.width,
          (y / heightSegments) * state.height
        );
        positions.push(point.x, point.y, point.z);
      }
    }

    for (let y = 0; y < heightSegments; y++) {
      for (let x = 0; x < widthSegments; x++) {
        const a = y * (widthSegments + 1) + x;
        const b = a + 1;
        const c = a + widthSegments + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function wrap(value, min, max) {
    const range = max - min;
    assert(range > 0, "Cannot wrap over a non-positive range.");
    let wrapped = (value - min) % range;
    if (wrapped < 0) {
      wrapped += range;
    }
    return wrapped + min;
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function parseRootCount(value) {
    const parsed = Number(value);
    assert(
      Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_ROOTS,
      `Roots must be an integer from 1 to ${MAX_ROOTS}; received ${JSON.stringify(value)}.`
    );
    return parsed;
  }

  function identify(nextX, nextY) {
    if (state.topology === "torus") {
      return {
        x: wrap(nextX, 0, state.width),
        y: wrap(nextY, 0, state.height)
      };
    }

    assert(state.topology === "rp2", `Unknown topology: ${state.topology}`);
    let nx = nextX;
    let ny = nextY;
    if (nx < 0 || nx >= state.width) {
      nx = nx < 0 ? nx + state.width : nx - state.width;
      ny = state.height - ny;
    }
    if (ny < 0 || ny >= state.height) {
      nx = state.width - nx;
      ny = ny < 0 ? ny + state.height : ny - state.height;
    }
    return {
      x: wrap(nx, 0, state.width),
      y: wrap(ny, 0, state.height)
    };
  }

  function rootsOfUnity(count) {
    assert(
      Number.isInteger(count) && count >= 1 && count <= MAX_ROOTS,
      `Invalid root count in topology state: ${count}.`
    );
    const k = count;
    const centerX = state.width / 2;
    const centerY = state.height / 2;
    const radius = Math.min(state.width, state.height) * 0.33;
    return Array.from({ length: k }, (_, index) => {
      const angle = (TWO_PI * index) / k;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
  }

  function mapSquareToTorus(x, y) {
    const u = (x / state.width) * TWO_PI;
    const v = (y / state.height) * TWO_PI;
    const major = TORUS_RADIUS + TORUS_TUBE * Math.cos(v);
    return new THREE.Vector3(
      major * Math.cos(u),
      major * Math.sin(u),
      TORUS_TUBE * Math.sin(v)
    );
  }

  function projectiveImmersion(x, y) {
    const line = squareToProjectiveLine(x, y);
    const scale = 5.2;
    return new THREE.Vector3(
      line.y * line.z,
      line.z * line.x,
      line.x * line.y
    ).multiplyScalar(scale);
  }

  function squareToProjectiveLine(x, y) {
    const sx = (x / state.width) * 2 - 1;
    const sy = (y / state.height) * 2 - 1;
    const radial = Math.max(Math.abs(sx), Math.abs(sy));
    assert(radial >= 0 && radial <= 1, `Square coordinate outside domain: (${x}, ${y}).`);
    if (radial === 0) {
      return new THREE.Vector3(0, 0, 1);
    }

    const length = Math.hypot(sx, sy);
    assert(length > 0, `Nonzero radial coordinate has zero Euclidean length: (${x}, ${y}).`);
    return new THREE.Vector3(
      (sx / length) * radial,
      (sy / length) * radial,
      Math.sqrt(1 - radial * radial)
    );
  }

  function mapSquareToSurface(x, y) {
    return state.topology === "torus" ? mapSquareToTorus(x, y) : projectiveImmersion(x, y);
  }

  function syncSurface() {
    const nextGeometry = state.topology === "torus" ? createTorusGeometry() : createRp2Geometry();
    surfaceMesh.geometry.dispose();
    surfaceMesh.geometry = nextGeometry;
    surfaceMesh.material = state.topology === "torus" ? torusMaterial : rp2Material;
    torusWire.geometry.dispose();
    torusWire.geometry = new THREE.WireframeGeometry(nextGeometry);
    torusWire.material.color.set(state.topology === "torus" ? 0x8fcaff : 0xff9dff);
    halo.visible = state.topology === "torus";
  }

  function assertProjectiveQuotientCompatibility() {
    const tolerance = 1e-8;
    for (let i = 0; i <= 16; i++) {
      const t = (state.height * i) / 16;
      const s = (state.width * i) / 16;
      const left = projectiveImmersion(0, t);
      const right = projectiveImmersion(state.width, state.height - t);
      const bottom = projectiveImmersion(s, 0);
      const top = projectiveImmersion(state.width - s, state.height);
      assert(
        left.distanceTo(right) < tolerance,
        `RP2 left/right edge pairing is not quotient-compatible at t=${t}.`
      );
      assert(
        bottom.distanceTo(top) < tolerance,
        `RP2 bottom/top edge pairing is not quotient-compatible at s=${s}.`
      );
    }
  }

  function addTrailPoint(x, y) {
    const last = state.trail[state.trail.length - 1];
    if (!last || last.x !== x || last.y !== y) {
      state.trail.push({ x, y });
    }
  }

  function movePlayer(deltaX, deltaY) {
    const current = identify(state.x + deltaX, state.y + deltaY);
    state.x = current.x;
    state.y = current.y;
    if (state.trailEnabled) {
      addTrailPoint(current.x, current.y);
    }
    syncAll();
  }

  function drawSquare() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssSize = Math.floor(squareCanvas.clientWidth);
    assert(cssSize > 0, "Square overlay has zero rendered width.");
    squareCanvas.width = Math.floor(cssSize * dpr);
    squareCanvas.height = Math.floor(cssSize * dpr);
    const scale = cssSize / state.width;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

    ctx.fillStyle = "rgba(0, 0, 0, 0.84)";
    ctx.fillRect(0, 0, state.width, state.height);

    const grid = 32;
    ctx.strokeStyle = "rgba(79, 195, 255, 0.13)";
    ctx.lineWidth = 1;
    for (let line = grid; line < state.width; line += grid) {
      ctx.beginPath();
      ctx.moveTo(line, 0);
      ctx.lineTo(line, state.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, line);
      ctx.lineTo(state.width, line);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 90, 90, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 7]);
    ctx.strokeRect(1, 1, state.width - 2, state.height - 2);
    ctx.setLineDash([]);

    ctx.fillStyle = "#47d26e";
    ctx.beginPath();
    ctx.arc(state.width / 2, state.height / 2, ROOT_RADIUS, 0, TWO_PI);
    ctx.fill();

    ctx.fillStyle = "#ff4a4a";
    for (const point of rootsOfUnity(state.roots)) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, ROOT_RADIUS - 1, 0, TWO_PI);
      ctx.fill();
    }

    ctx.fillStyle = state.pathColor;
    const half = TRAIL_BREADCRUMB_SIZE / 2;
    for (const point of state.trail) {
      ctx.fillRect(point.x - half, point.y - half, TRAIL_BREADCRUMB_SIZE, TRAIL_BREADCRUMB_SIZE);
    }

    ctx.fillStyle = state.pathColor;
    ctx.shadowColor = state.pathColor;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(state.x, state.y, MARKER_RADIUS, 0, TWO_PI);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function syncRoots() {
    const roots = rootsOfUnity(state.roots);
    while (rootDots.length < roots.length) {
      const dot = new THREE.Mesh(rootGeometry, rootMaterial);
      scene.add(dot);
      rootDots.push(dot);
    }
    while (rootDots.length > roots.length) {
      const dot = rootDots.pop();
      scene.remove(dot);
    }
    roots.forEach((point, index) => {
      rootDots[index].position.copy(mapSquareToSurface(point.x, point.y));
    });
  }

  function syncTrail() {
    while (trailDots.length < state.trail.length) {
      const dot = new THREE.Mesh(trailGeometry, trailMaterial);
      dot.frustumCulled = false;
      scene.add(dot);
      trailDots.push(dot);
    }
    trailDots.forEach((dot, index) => {
      dot.visible = index < state.trail.length;
      if (dot.visible) {
        dot.position.copy(mapSquareToSurface(state.trail[index].x, state.trail[index].y));
      }
    });
  }

  function syncColors() {
    const color = new THREE.Color(state.pathColor);
    markerMaterial.color.copy(color);
    trailMaterial.color.copy(color);
  }

  function syncAll() {
    drawSquare();
    syncColors();
    syncRoots();
    syncTrail();
    marker.position.copy(mapSquareToSurface(state.x, state.y));
    trailStatus.textContent = state.trailEnabled ? "Trail on" : "Trail off";
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    assert(width > 0 && height > 0, "Viewport has invalid dimensions.");
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    syncAll();
  }

  function render(time) {
    const seconds = time * 0.001;
    surfaceMesh.rotation.z = Math.sin(seconds * 0.17) * 0.035;
    halo.rotation.z = seconds * 0.09;
    stars.rotation.y = seconds * 0.012;
    stars.rotation.x = seconds * 0.004;
    controls.update();
    renderer.render(scene, camera);
  }

  function onKeyDown(event) {
    const key = event.key;
    if (key === "t" || key === "T") {
      event.preventDefault();
      state.trailEnabled = !state.trailEnabled;
      if (state.trailEnabled) {
        addTrailPoint(state.x, state.y);
      }
      syncAll();
      return;
    }

    if (key === "ArrowLeft") {
      event.preventDefault();
      movePlayer(-STEP, 0);
      return;
    }
    if (key === "ArrowRight") {
      event.preventDefault();
      movePlayer(STEP, 0);
      return;
    }
    if (key === "ArrowUp") {
      event.preventDefault();
      movePlayer(0, -STEP);
      return;
    }
    if (key === "ArrowDown") {
      event.preventDefault();
      movePlayer(0, STEP);
    }
  }

  topologyControl.addEventListener("change", (event) => {
    assert(event.target instanceof HTMLSelectElement, "Topology event target is not a select.");
    state.topology = event.target.value;
    syncSurface();
    syncAll();
  });

  rootsControl.addEventListener("input", (event) => {
    assert(event.target instanceof HTMLInputElement, "Roots event target is not an input.");
    state.roots = parseRootCount(event.target.value);
    event.target.value = String(state.roots);
    syncAll();
  });

  colorControl.addEventListener("change", (event) => {
    assert(event.target instanceof HTMLSelectElement, "Color event target is not a select.");
    state.pathColor = event.target.value;
    syncAll();
  });

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", resize);
})();
