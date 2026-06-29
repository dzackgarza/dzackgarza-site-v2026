import { Application, Graphics } from "https://cdn.jsdelivr.net/npm/pixi.js@8.16.0/dist/pixi.mjs";

const COLORS = {
  vertex: 0xf7f2e8,
  vertexCore: 0x60f3b2,
  edge: 0x57b8ff,
  face: 0xa993ff,
  manualFace: 0x60f3b2,
  threshold: 0xffb84d,
};

function mapPoint(point, width, height) {
  const pad = Math.min(width, height) * 0.075;
  return {
    x: pad + point.x * (width - pad * 2),
    y: pad + point.y * (height - pad * 2),
  };
}

function unmapPoint(x, y, width, height) {
  const pad = Math.min(width, height) * 0.075;
  return {
    x: Math.min(1, Math.max(0, (x - pad) / (width - pad * 2))),
    y: Math.min(1, Math.max(0, (y - pad) / (height - pad * 2))),
  };
}

export async function createRenderer(container) {
  const app = new Application();
  await app.init({
    antialias: true,
    autoStart: false,
    autoDensity: true,
    backgroundAlpha: 0,
    resizeTo: container,
  });
  container.appendChild(app.canvas);

  const faceLayer = new Graphics();
  const edgeLayer = new Graphics();
  const haloLayer = new Graphics();
  const pointLayer = new Graphics();
  app.stage.addChild(faceLayer, edgeLayer, haloLayer, pointLayer);

  function draw(complex, options = {}) {
    const width = app.screen.width;
    const height = app.screen.height;
    const mapped = complex.points.map((point) => mapPoint(point, width, height));
    const unit = Math.min(width, height);
    const pad = unit * 0.075;
    const thresholdRadius = complex.threshold * (unit - pad * 2);

    faceLayer.clear();
    edgeLayer.clear();
    haloLayer.clear();
    pointLayer.clear();

    const triangles = options.faces === false || complex.limitedAt === "faces" ? [] : complex.simplices[2];
    const triangleLimit = Math.min(triangles.length, 1400);
    for (let index = 0; index < triangleLimit; index += 1) {
      const [a, b, c] = triangles[index];
      faceLayer.poly([
        mapped[a].x,
        mapped[a].y,
        mapped[b].x,
        mapped[b].y,
        mapped[c].x,
        mapped[c].y,
      ]);
      faceLayer.fill(COLORS.face, 0.082);
    }

    for (const [a, b, c] of complex.manualFaces ?? []) {
      faceLayer.poly([
        mapped[a].x,
        mapped[a].y,
        mapped[b].x,
        mapped[b].y,
        mapped[c].x,
        mapped[c].y,
      ]);
      faceLayer.fill(COLORS.manualFace, 0.24);
      faceLayer.poly([
        mapped[a].x,
        mapped[a].y,
        mapped[b].x,
        mapped[b].y,
        mapped[c].x,
        mapped[c].y,
      ]);
      faceLayer.stroke({ width: 1.8, color: COLORS.manualFace, alpha: 0.52 });
    }

    for (const [a, b] of complex.simplices[1]) {
      edgeLayer.moveTo(mapped[a].x, mapped[a].y);
      edgeLayer.lineTo(mapped[b].x, mapped[b].y);
    }
    edgeLayer.stroke({ width: 1.15, color: COLORS.edge, alpha: 0.46 });

    for (const point of mapped) {
      if (options.halos !== false) {
        haloLayer.circle(point.x, point.y, thresholdRadius);
        haloLayer.fill(COLORS.threshold, 0.018);
        haloLayer.circle(point.x, point.y, thresholdRadius);
        haloLayer.stroke({ width: 1.15, color: COLORS.threshold, alpha: 0.105 });
      }

      pointLayer.circle(point.x, point.y, 4.7);
      pointLayer.fill(COLORS.vertex, 0.9);
      pointLayer.circle(point.x, point.y, 2.4);
      pointLayer.fill(COLORS.vertexCore, 1);
    }

    if (typeof app.render === "function") {
      app.render();
    } else {
      app.renderer.render({ container: app.stage });
    }
  }

  return {
    app,
    canvas: app.canvas,
    clientToPoint(clientX, clientY) {
      const rect = app.canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return null;
      }
      const x = (clientX - rect.left) * (app.screen.width / rect.width);
      const y = (clientY - rect.top) * (app.screen.height / rect.height);
      return unmapPoint(x, y, app.screen.width, app.screen.height);
    },
    draw,
    fps: () => Math.round(app.ticker.FPS),
    setAnimating(active) {
      if (active) {
        app.start();
      } else {
        app.stop();
      }
    },
  };
}
