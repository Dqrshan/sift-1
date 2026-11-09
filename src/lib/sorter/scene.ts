"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useSorter } from "./store";
import { sorterAudio } from "./audio";
import { CATEGORIES, SORTED_CATEGORIES, type Category, type WasteItemDef } from "./types";
import { ITEMS } from "./items";

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */
const COL = {
  ivory: 0xeae4d4,
  ivoryDark: 0xded6c2,
  lid: 0xe6dfcd,
  ink: 0x12150f,
  inkSoft: 0x1c201b,
  darkGlass: 0x0d100c,
  oak: 0xa98467,
  lime: 0xd7f171,
  cream: 0xf3eee2,
  podBlack: 0x161915,
};

const CATEGORY_HEX: Record<Category, number> = {
  organic: 0x9bbf72,
  recyclable: 0xe3b341,
  paper: 0xc9794f,
  general: 0x9a968a,
  hazard: 0xb26e92,
};

/* Aperture centres on the deck (x, z) */
const APERTURE: Record<Category, { x: number; z: number }> = {
  organic: { x: -0.62, z: -0.34 },
  recyclable: { x: 0.62, z: -0.34 },
  paper: { x: -0.62, z: 0.34 },
  general: { x: 0.62, z: 0.34 },
  hazard: { x: -0.62, z: 0 }, // drawer (front face)
};

const DECK_TOP = 1.92;
const HOVER = new THREE.Vector3(0, 2.34, 0);
const SPAWN = new THREE.Vector3(-2.2, 3.35, 0.9);

/* ------------------------------------------------------------------ */
/* Easing                                                              */
/* ------------------------------------------------------------------ */
const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
const easeInQuad = (k: number) => k * k;
const easeInOutCubic = (k: number) =>
  k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const easeOutBack = (k: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};

/* ------------------------------------------------------------------ */
/* Canvas texture helpers                                              */
/* ------------------------------------------------------------------ */
function makeScanTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(215,241,113,0)");
  g.addColorStop(0.72, "rgba(215,241,113,0.55)");
  g.addColorStop(0.9, "rgba(215,241,113,0.95)");
  g.addColorStop(1, "rgba(215,241,113,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeNewsprintTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#e9e5d7";
  ctx.fillRect(0, 0, 128, 160);
  ctx.fillStyle = "rgba(60,60,55,0.55)";
  for (let y = 14; y < 150; y += 9) {
    const w = 8 + Math.random() * 100;
    ctx.fillRect(10, y, w, 2);
    if (Math.random() > 0.72) ctx.fillRect(10, y + 4, w * 0.6, 2);
  }
  ctx.fillStyle = "rgba(40,40,36,0.85)";
  ctx.fillRect(10, 4, 60, 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class LabelSprite {
  sprite: THREE.Sprite;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private color = "#d7f171";

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 512;
    this.canvas.height = 160;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
    });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.scale.set(1.5, 0.47, 1);
    this.sprite.renderOrder = 20;
    this.draw("SCANNING", "", this.color);
  }

  draw(title: string, sub: string, color: string) {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const r = 28;
    ctx.beginPath();
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, r);
    ctx.fillStyle = "rgba(13,17,13,0.88)";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(48, 56, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f3eee2";
    ctx.font = "600 40px 'JetBrains Mono', monospace";
    ctx.textBaseline = "middle";
    ctx.fillText(title.toUpperCase().slice(0, 22), 76, 52);

    if (sub) {
      ctx.fillStyle = "rgba(243,238,226,0.62)";
      ctx.font = "400 26px 'JetBrains Mono', monospace";
      ctx.fillText(sub.slice(0, 34), 76, 106);
    }
    this.texture.needsUpdate = true;
  }

  setColor(c: string) {
    this.color = c;
  }

  dispose() {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}

class BinDisplay {
  texture: THREE.CanvasTexture;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 512;
    this.canvas.height = 144;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.draw("BOOT", "SIFT OS 2.1", "#d7f171");
  }

  draw(big: string, small: string, color: string) {
    const { ctx, canvas } = this;
    ctx.fillStyle = "#0a0c09";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // subtle scan texture
    ctx.fillStyle = "rgba(215,241,113,0.03)";
    for (let y = 0; y < canvas.height; y += 4) ctx.fillRect(0, y, canvas.width, 1);

    // header row
    ctx.fillStyle = "rgba(243,238,226,0.55)";
    ctx.font = "600 20px 'JetBrains Mono', monospace";
    ctx.textBaseline = "middle";
    ctx.fillText("SIFT·1", 20, 24);

    // wifi arcs (top-right)
    ctx.strokeStyle = "rgba(215,241,113,0.8)";
    ctx.lineWidth = 3;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(canvas.width - 24, 30, i * 7, Math.PI * 1.28, Math.PI * 1.72);
      ctx.stroke();
    }

    // big status
    ctx.fillStyle = color;
    ctx.font = "700 46px 'JetBrains Mono', monospace";
    ctx.fillText(big.toUpperCase().slice(0, 14), 20, 78);

    // small detail
    ctx.fillStyle = "rgba(243,238,226,0.5)";
    ctx.font = "400 22px 'JetBrains Mono', monospace";
    ctx.fillText(small.slice(0, 30), 20, 118);
    this.texture.needsUpdate = true;
  }
}

/* ------------------------------------------------------------------ */
/* Tweens                                                              */
/* ------------------------------------------------------------------ */
interface Tween {
  elapsed: number;
  dur: number;
  ease: (k: number) => number;
  onUpdate: (k: number) => void;
  resolve: () => void;
  delay: number;
}

/* ------------------------------------------------------------------ */
/* Main scene                                                          */
/* ------------------------------------------------------------------ */
export class SorterScene {
  private container!: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private feedRenderer!: THREE.WebGLRenderer;
  private feedCanvas!: HTMLCanvasElement;
  private feedOverlay!: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private feedCamera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;

  private tweens: Tween[] = [];
  private pipeline: Promise<void> = Promise.resolve();
  private busy = false;
  private queue: WasteItemDef[] = [];
  private lastSortAt = 0;
  private reviewResolver: ((c: Category) => void) | null = null;
  private reviewTimer: ReturnType<typeof setTimeout> | null = null;
  private reviewWasHuman = false;
  private feedVisible = true;
  private bobbing = false;

  // bin parts
  private binGroup = new THREE.Group();
  private lids: Record<string, { pivot: THREE.Group; target: Category }> = {};
  private drawer!: THREE.Group;
  private drawerOut = false;
  private ledStrip!: THREE.Mesh;
  private ledRing!: THREE.Mesh;
  private podLens!: THREE.Mesh;
  private display!: BinDisplay;
  private shellMats: THREE.MeshStandardMaterial[] = [];
  private tubMats: THREE.MeshStandardMaterial[] = [];
  private edgeLines!: THREE.LineSegments;
  private scanCone!: THREE.Mesh;
  private scanPlane!: THREE.Mesh;

  // item FX
  private label!: LabelSprite;
  private bbox!: THREE.LineSegments;
  private activeItem: THREE.Group | null = null;

  // piles
  private piles: Record<string, { group: THREE.Group; count: number }> = {};

  // display override
  private displayOverride: { until: number; big: string; small: string; color: string } | null =
    null;

  private unsubStore: (() => void) | null = null;
  private resizeObs: ResizeObserver | null = null;
  private autoTimer = 0;
  private lastFrameAt = 0;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;

  mount(container: HTMLElement, feedHost?: HTMLElement) {
    this.container = container;
    const isSmall = window.innerWidth < 768;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* renderer ------------------------------------------------------ */
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";

    /* scene --------------------------------------------------------- */
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0d110d, 13, 26);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTex;
    this.scene.environmentIntensity = 0.62;
    pmrem.dispose();

    /* camera -------------------------------------------------------- */
    this.camera = new THREE.PerspectiveCamera(
      34,
      container.clientWidth / container.clientHeight,
      0.1,
      60
    );
    // pull back a little on narrow screens so the whole product stays in frame
    const dolly = container.clientWidth < 640 ? 1.32 : 1;
    this.camera.position.set(3.1 * dolly, 3.3 * dolly, 7.4 * dolly);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.08, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 4.2;
    this.controls.maxDistance = 12;
    this.controls.maxPolarAngle = 1.48;
    this.controls.minPolarAngle = 0.3;
    this.controls.autoRotate = !reduceMotion;
    this.controls.autoRotateSpeed = 0.55;

    /* lights -------------------------------------------------------- */
    const key = new THREE.DirectionalLight(0xfff6e0, 2.1);
    key.position.set(3.4, 6.5, 4.2);
    key.castShadow = true;
    key.shadow.mapSize.set(isSmall ? 1024 : 2048, isSmall ? 1024 : 2048);
    key.shadow.camera.left = -4.5;
    key.shadow.camera.right = 4.5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0xcfe0c0, 0.9);
    rim.position.set(-5, 4, -5);
    this.scene.add(rim);

    this.scene.add(new THREE.AmbientLight(0xc9d4c0, 0.32));

    const fill = new THREE.PointLight(0xd7f171, 4, 9, 2);
    fill.position.set(-1.5, 1.2, 4.5);
    this.scene.add(fill);

    /* stage --------------------------------------------------------- */
    const shadowCatcher = new THREE.Mesh(
      new THREE.CircleGeometry(9, 48),
      new THREE.ShadowMaterial({ opacity: 0.34 })
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = -0.001;
    shadowCatcher.receiveShadow = true;
    this.scene.add(shadowCatcher);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.85, 2.95, 0.1, 72),
      new THREE.MeshStandardMaterial({ color: 0x1c201b, roughness: 0.85, metalness: 0.1 })
    );
    platform.position.y = -0.05;
    platform.receiveShadow = true;
    this.scene.add(platform);

    const stageRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.85, 0.008, 8, 96),
      new THREE.MeshStandardMaterial({
        color: COL.lime,
        emissive: COL.lime,
        emissiveIntensity: 0.55,
        roughness: 0.4,
      })
    );
    stageRing.rotation.x = Math.PI / 2;
    stageRing.position.y = 0.002;
    this.scene.add(stageRing);

    this.buildBin();

    /* FX helpers ----------------------------------------------------- */
    this.label = new LabelSprite();
    this.label.sprite.visible = false;
    this.scene.add(this.label.sprite);

    this.bbox = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: COL.lime, transparent: true, opacity: 0 })
    );
    this.bbox.visible = false;
    this.scene.add(this.bbox);

    this.scanCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.0, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: COL.lime,
        transparent: true,
        opacity: 0,
        wireframe: true,
        depthWrite: false,
      })
    );
    this.scanCone.visible = false;
    this.scene.add(this.scanCone);

    this.scanPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 1.5),
      new THREE.MeshBasicMaterial({
        map: makeScanTexture(),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.scanPlane.visible = false;
    this.scene.add(this.scanPlane);

    /* AI camera feed -------------------------------------------------- */
    this.feedCanvas = document.createElement("canvas");
    this.feedCanvas.width = 288;
    this.feedCanvas.height = 180;
    this.feedRenderer = new THREE.WebGLRenderer({ canvas: this.feedCanvas, antialias: false, alpha: true });
    this.feedRenderer.setSize(288, 180, false);
    this.feedRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.feedRenderer.toneMappingExposure = 1.1;
    this.feedCamera = new THREE.PerspectiveCamera(46, 288 / 180, 0.1, 20);
    this.feedCamera.position.set(0, 2.62, -1.05);
    this.feedCamera.lookAt(0, 2.2, 0.35);

    /* store sync ------------------------------------------------------ */
    this.unsubStore = useSorter.subscribe((state, prev) => {
      if (state.xray !== prev.xray) this.applyXray(state.xray);
      if (state.status !== prev.status && !this.displayOverride) {
        const color =
          state.status === "ready"
            ? "#d7f171"
            : state.status === "review"
              ? "#e3b341"
              : state.status === "full"
                ? "#c9794f"
                : "#d7f171";
        this.display.draw(
          state.status === "ready" ? "READY" : state.status.toUpperCase(),
          state.statusDetail,
          color
        );
      }
    });

    /* resize ---------------------------------------------------------- */
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);

    if (feedHost) {
      // live feed canvas lives inside the HUD vision panel
      this.feedCanvas.style.display = "block";
      this.feedCanvas.style.width = "100%";
      this.feedCanvas.style.height = "100%";
      feedHost.appendChild(this.feedCanvas);
    } else {
      this.container.appendChild(this.feedCanvas); // hidden source canvas
      this.feedCanvas.style.display = "none";
    }

    this.loop();
    // Throttle guard: on heavily throttled/background tabs RAF may barely fire.
    // A gentle fallback keeps the sorting simulation progressing in wall time.
    this.fallbackTimer = setInterval(() => {
      if (this.disposed) return;
      if (performance.now() - this.lastFrameAt > 300) this.loopBody();
    }, 250);
    void this.bootSequence();
    // dev/debug handle (harmless in prod, enables browser-console inspection)
    (window as unknown as { __siftScene?: SorterScene }).__siftScene = this;
  }

  /* ---------------------------------------------------------------- */
  /* Bin model                                                         */
  /* ---------------------------------------------------------------- */
  private buildBin() {
    const g = this.binGroup;
    g.position.y = 0.05;
    this.scene.add(g);

    const shellMat = new THREE.MeshStandardMaterial({ color: COL.ivory, roughness: 0.52, metalness: 0.03 });
    const deckMat = new THREE.MeshStandardMaterial({ color: COL.ivoryDark, roughness: 0.5, metalness: 0.03 });
    const lidMat = new THREE.MeshStandardMaterial({ color: COL.lid, roughness: 0.55, metalness: 0.02 });
    const darkMat = new THREE.MeshStandardMaterial({ color: COL.ink, roughness: 0.6, metalness: 0.2 });
    const oakMat = new THREE.MeshStandardMaterial({ color: COL.oak, roughness: 0.62, metalness: 0.02 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: COL.darkGlass,
      roughness: 0.16,
      metalness: 0.5,
    });
    this.shellMats.push(shellMat, deckMat, lidMat, oakMat);

    // plinth
    const plinth = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.12, 1.6, 4, 0.05), darkMat);
    plinth.position.y = 0.06;
    plinth.castShadow = true;
    g.add(plinth);

    // body
    const body = new THREE.Mesh(new RoundedBoxGeometry(2.4, 1.7, 1.7, 6, 0.17), shellMat);
    body.position.y = 0.97;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    // seam shadow line between body & deck
    const seam = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.016, 1.72), darkMat);
    seam.position.y = 1.828;
    g.add(seam);

    // deck
    const deck = new THREE.Mesh(new RoundedBoxGeometry(2.46, 0.11, 1.76, 5, 0.07), deckMat);
    deck.position.y = 1.9;
    deck.castShadow = true;
    g.add(deck);

    // oak side handles
    for (const sx of [-1.22, 1.22]) {
      const handle = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.5, 0.72, 3, 0.028), oakMat);
      handle.position.set(sx, 1.1, 0);
      handle.castShadow = true;
      g.add(handle);
    }

    // front LED strip
    const ledMat = new THREE.MeshStandardMaterial({
      color: COL.cream,
      emissive: COL.cream,
      emissiveIntensity: 0.5,
      roughness: 0.3,
    });
    this.ledStrip = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.024, 0.02, 2, 0.01), ledMat);
    this.ledStrip.position.set(0, 1.77, 0.862);
    g.add(this.ledStrip);

    // display glass
    const displayGlass = new THREE.Mesh(new RoundedBoxGeometry(1.52, 0.38, 0.03, 3, 0.04), glassMat);
    displayGlass.position.set(0, 1.48, 0.858);
    g.add(displayGlass);

    this.display = new BinDisplay();
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.46, 0.34),
      new THREE.MeshBasicMaterial({ map: this.display.texture })
    );
    screen.position.set(0, 1.48, 0.876);
    g.add(screen);

    // brand plate under display
    const brand = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.055),
      new THREE.MeshBasicMaterial({ color: 0x6b6a5e, transparent: true, opacity: 0.7 })
    );
    brand.position.set(0, 1.2, 0.856);
    g.add(brand);

    // sensor pod
    const podBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.07, 32), darkMat);
    podBase.position.set(0, DECK_TOP + 0.03, -0.72);
    g.add(podBase);
    const podDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: COL.podBlack, roughness: 0.2, metalness: 0.55 })
    );
    podDome.position.set(0, DECK_TOP + 0.065, -0.72);
    podDome.castShadow = true;
    g.add(podDome);
    this.podLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.035, 24),
      new THREE.MeshStandardMaterial({
        color: 0x0c0e0a,
        emissive: COL.lime,
        emissiveIntensity: 1.6,
        roughness: 0.25,
      })
    );
    this.podLens.position.set(0, DECK_TOP + 0.115, -0.66);
    this.podLens.rotation.x = -0.5;
    g.add(this.podLens);

    // LED ring around pod
    this.ledRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.012, 10, 48),
      new THREE.MeshStandardMaterial({
        color: COL.cream,
        emissive: COL.cream,
        emissiveIntensity: 0.8,
        roughness: 0.35,
      })
    );
    this.ledRing.rotation.x = Math.PI / 2;
    this.ledRing.position.set(0, DECK_TOP + 0.045, -0.72);
    g.add(this.ledRing);

    // feet
    for (const [fx, fz] of [
      [-1.0, -0.62],
      [1.0, -0.62],
      [-1.0, 0.62],
      [1.0, 0.62],
    ]) {
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.06, 0.06, 20),
        darkMat
      );
      foot.position.set(fx, 0.03, fz);
      g.add(foot);
    }

    /* apertures, lids, throats, tubs, piles --------------------------- */
    const apertureMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.7 });
    for (const cat of SORTED_CATEGORIES) {
      const { x, z } = APERTURE[cat];

      // aperture inset
      const inset = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.045, 0.54, 2, 0.03), apertureMat);
      inset.position.set(x, DECK_TOP + 0.002, z);
      g.add(inset);

      // hollow throat
      const throat = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.58, 0.46),
        new THREE.MeshStandardMaterial({ color: 0x0e100c, side: THREE.BackSide, roughness: 0.9 })
      );
      throat.position.set(x, DECK_TOP - 0.28, z);
      g.add(throat);

      // translucent tub
      const tubMat = new THREE.MeshStandardMaterial({
        color: CATEGORY_HEX[cat],
        transparent: true,
        opacity: 0.32,
        roughness: 0.35,
        metalness: 0.05,
        depthWrite: false,
      });
      this.tubMats.push(tubMat);
      const tub = new THREE.Mesh(new RoundedBoxGeometry(0.58, 1.05, 0.48, 3, 0.05), tubMat);
      tub.position.set(x, 0.78, z);
      g.add(tub);

      // pile group
      const pile = new THREE.Group();
      pile.position.set(x, 0.34, z);
      g.add(pile);
      this.piles[cat] = { group: pile, count: 0 };

      // lid + hinge
      const pivot = new THREE.Group();
      pivot.position.set(x, DECK_TOP + 0.055, z - 0.25);
      const lid = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.055, 0.5, 3, 0.03), lidMat);
      lid.position.z = 0.25;
      lid.castShadow = true;
      pivot.add(lid);

      // category inlay dot
      const dot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.012, 24),
        new THREE.MeshStandardMaterial({
          color: CATEGORY_HEX[cat],
          emissive: CATEGORY_HEX[cat],
          emissiveIntensity: 0.35,
          roughness: 0.4,
        })
      );
      dot.position.set(0, 0.032, 0.25);
      pivot.add(dot);

      pivot.rotation.x = 0;
      g.add(pivot);
      this.lids[cat] = { pivot, target: cat };
    }

    // hazard drawer
    this.drawer = new THREE.Group();
    this.drawer.position.set(-0.62, 0.52, 0);
    const drawerFront = new THREE.Mesh(
      new RoundedBoxGeometry(0.78, 0.4, 0.045, 3, 0.03),
      new THREE.MeshStandardMaterial({ color: COL.ivory, roughness: 0.52 })
    );
    drawerFront.position.z = 0.86;
    drawerFront.castShadow = true;
    this.shellMats.push(drawerFront.material as THREE.MeshStandardMaterial);
    this.drawer.add(drawerFront);
    const drawerGrip = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.05, 0.035, 2, 0.015), darkMat);
    drawerGrip.position.set(0, 0.12, 0.885);
    this.drawer.add(drawerGrip);
    // tray
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x241d26, roughness: 0.6 });
    const trayFloor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.4), trayMat);
    trayFloor.position.set(0, -0.2, 0.66);
    this.drawer.add(trayFloor);
    for (const [wx, wz, w, d] of [
      [0, 0.855, 0.6, 0.03],
      [0, 0.465, 0.6, 0.03],
      [-0.285, 0.66, 0.03, 0.42],
      [0.285, 0.66, 0.03, 0.42],
    ]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), trayMat);
      wall.position.set(wx, -0.12, wz);
      this.drawer.add(wall);
    }
    const hazardPile = new THREE.Group();
    hazardPile.position.set(0, -0.15, 0.66);
    this.drawer.add(hazardPile);
    this.piles.hazard = { group: hazardPile, count: 0 };
    g.add(this.drawer);

    // x-ray edges
    const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.4, 1.7, 1.7, 6, 0.17));
    this.edgeLines = new THREE.LineSegments(
      edgeGeo,
      new THREE.LineBasicMaterial({ color: 0x9bbf72, transparent: true, opacity: 0 })
    );
    this.edgeLines.position.y = 0.97;
    g.add(this.edgeLines);
  }

  /* ---------------------------------------------------------------- */
  /* Item factory                                                      */
  /* ---------------------------------------------------------------- */
  private buildItem(shape: WasteItemDef["shape"]): THREE.Group {
    const group = new THREE.Group();

    const std = (opts: THREE.MeshStandardMaterialParameters) =>
      new THREE.MeshStandardMaterial(opts);

    switch (shape) {
      case "banana": {
        const geo = new THREE.TorusGeometry(0.17, 0.05, 10, 26, 2.4);
        const m = new THREE.Mesh(geo, std({ color: 0xefd26b, roughness: 0.6 }));
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = -1.2;
        group.add(m);
        group.position.y = 0.05;
        break;
      }
      case "apple": {
        const pts: THREE.Vector2[] = [
          new THREE.Vector2(0.001, 0),
          new THREE.Vector2(0.1, 0.01),
          new THREE.Vector2(0.115, 0.05),
          new THREE.Vector2(0.055, 0.12),
          new THREE.Vector2(0.05, 0.14),
          new THREE.Vector2(0.11, 0.2),
          new THREE.Vector2(0.08, 0.23),
          new THREE.Vector2(0.001, 0.24),
        ];
        const m = new THREE.Mesh(
          new THREE.LatheGeometry(pts, 24),
          std({ color: 0xd8dca4, roughness: 0.65 })
        );
        group.add(m);
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.01, 0.05, 8),
          std({ color: 0x6b4a2f, roughness: 0.8 })
        );
        stem.position.y = 0.26;
        group.add(stem);
        break;
      }
      case "bottle": {
        const pts: THREE.Vector2[] = [
          new THREE.Vector2(0.001, 0),
          new THREE.Vector2(0.095, 0),
          new THREE.Vector2(0.1, 0.02),
          new THREE.Vector2(0.1, 0.26),
          new THREE.Vector2(0.045, 0.33),
          new THREE.Vector2(0.04, 0.4),
          new THREE.Vector2(0.043, 0.42),
          new THREE.Vector2(0.001, 0.42),
        ];
        const m = new THREE.Mesh(
          new THREE.LatheGeometry(pts, 26),
          new THREE.MeshPhysicalMaterial({
            color: 0xcde8e0,
            transmission: 0.7,
            thickness: 0.04,
            roughness: 0.12,
            ior: 1.4,
            transparent: true,
          })
        );
        group.add(m);
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.046, 0.046, 0.045, 20),
          std({ color: 0xf4f1e8, roughness: 0.4 })
        );
        cap.position.y = 0.44;
        group.add(cap);
        const lbl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.101, 0.101, 0.09, 26, 1, true),
          std({ color: 0xdff3ee, roughness: 0.5 })
        );
        lbl.position.y = 0.14;
        group.add(lbl);
        break;
      }
      case "can": {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.26, 28),
          std({ color: 0xc7ccd1, metalness: 0.92, roughness: 0.26 })
        );
        group.add(m);
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(0.101, 0.101, 0.1, 28, 1, true),
          std({ color: 0xc25b45, roughness: 0.4 })
        );
        band.position.y = 0.01;
        group.add(band);
        const top = new THREE.Mesh(
          new THREE.CylinderGeometry(0.099, 0.099, 0.006, 28),
          std({ color: 0xb9bec4, metalness: 0.9, roughness: 0.3 })
        );
        top.position.y = 0.132;
        group.add(top);
        break;
      }
      case "jar": {
        const pts: THREE.Vector2[] = [
          new THREE.Vector2(0.001, 0),
          new THREE.Vector2(0.12, 0),
          new THREE.Vector2(0.135, 0.05),
          new THREE.Vector2(0.135, 0.16),
          new THREE.Vector2(0.11, 0.19),
          new THREE.Vector2(0.1, 0.2),
          new THREE.Vector2(0.001, 0.2),
        ];
        const m = new THREE.Mesh(
          new THREE.LatheGeometry(pts, 26),
          new THREE.MeshPhysicalMaterial({
            color: 0xd9ece4,
            transmission: 0.85,
            thickness: 0.06,
            roughness: 0.06,
            ior: 1.5,
            transparent: true,
          })
        );
        group.add(m);
        const lidM = new THREE.Mesh(
          new THREE.CylinderGeometry(0.125, 0.125, 0.05, 26),
          std({ color: 0xb98a5a, metalness: 0.35, roughness: 0.4 })
        );
        lidM.position.y = 0.222;
        group.add(lidM);
        break;
      }
      case "newspaper": {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.36, 0.016, 0.46),
          std({ color: 0xe9e5d7, roughness: 0.85, map: makeNewsprintTexture() })
        );
        m.rotation.y = 0.4;
        group.add(m);
        break;
      }
      case "cardboard": {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.36, 0.28, 0.32),
          std({ color: 0xc6a375, roughness: 0.88 })
        );
        group.add(m);
        const tape = new THREE.Mesh(
          new THREE.BoxGeometry(0.38, 0.012, 0.07),
          std({ color: 0xa98f6b, roughness: 0.45 })
        );
        tape.position.y = 0.145;
        group.add(tape);
        break;
      }
      case "chipbag": {
        const m = new THREE.Mesh(
          new RoundedBoxGeometry(0.3, 0.22, 0.1, 2, 0.02),
          std({ color: 0xdc8f4b, metalness: 0.5, roughness: 0.3 })
        );
        m.scale.set(1.04, 0.97, 1.1);
        m.rotation.z = 0.06;
        group.add(m);
        const stripe = new THREE.Mesh(
          new RoundedBoxGeometry(0.31, 0.05, 0.105, 2, 0.02),
          std({ color: 0xf3eee2, metalness: 0.4, roughness: 0.35 })
        );
        stripe.position.y = 0.02;
        group.add(stripe);
        break;
      }
      case "cup": {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.095, 0.07, 0.2, 26),
          std({ color: 0xf2efe6, roughness: 0.6 })
        );
        group.add(m);
        const sleeve = new THREE.Mesh(
          new THREE.CylinderGeometry(0.088, 0.078, 0.09, 26),
          std({ color: 0xb98a6a, roughness: 0.75 })
        );
        sleeve.position.y = -0.01;
        group.add(sleeve);
        const lidM = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.025, 26),
          std({ color: 0xf5f3ec, roughness: 0.4 })
        );
        lidM.position.y = 0.112;
        group.add(lidM);
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.098, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          std({ color: 0xf5f3ec, roughness: 0.4 })
        );
        dome.scale.y = 0.25;
        dome.position.y = 0.125;
        group.add(dome);
        break;
      }
      case "battery": {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.065, 0.065, 0.2, 22),
          std({ color: 0x3b4048, metalness: 0.5, roughness: 0.35 })
        );
        group.add(m);
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(0.066, 0.066, 0.05, 22, 1, true),
          std({ color: 0xd9d4c8, roughness: 0.5 })
        );
        ring.position.y = 0.02;
        group.add(ring);
        const nub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.024, 14),
          std({ color: 0xc9974b, metalness: 0.8, roughness: 0.3 })
        );
        nub.position.y = 0.112;
        group.add(nub);
        group.rotation.z = Math.PI / 2.2;
        break;
      }
      case "phone": {
        const m = new THREE.Mesh(
          new RoundedBoxGeometry(0.17, 0.024, 0.33, 3, 0.012),
          std({ color: 0x1f2226, metalness: 0.6, roughness: 0.3 })
        );
        group.add(m);
        const screenM = new THREE.Mesh(
          new THREE.PlaneGeometry(0.145, 0.29),
          std({ color: 0x2e3b36, emissive: 0x2e3b36, emissiveIntensity: 0.25, roughness: 0.2 })
        );
        screenM.position.y = 0.013;
        screenM.rotation.x = -Math.PI / 2;
        group.add(screenM);
        break;
      }
    }

    group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
      }
    });
    return group;
  }

  /* ---------------------------------------------------------------- */
  /* Tween infra                                                       */
  /* ---------------------------------------------------------------- */
  private tween(dur: number, ease: (k: number) => number, onUpdate: (k: number) => void, delay = 0) {
    return new Promise<void>((resolve) => {
      if (this.disposed) {
        resolve();
        return;
      }
      this.tweens.push({ elapsed: 0, dur, ease, onUpdate, resolve, delay });
    });
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => {
      if (this.disposed) {
        resolve();
        return;
      }
      setTimeout(() => {
        if (!this.disposed) resolve();
      }, ms);
    });
  }

  private setLed(color: number, intensity: number) {
    for (const led of [this.ledStrip, this.ledRing]) {
      const m = led.material as THREE.MeshStandardMaterial;
      m.color.setHex(color);
      m.emissive.setHex(color);
      m.emissiveIntensity = intensity;
    }
  }

  private setDisplay(big: string, small: string, color: string, holdMs = 0) {
    if (holdMs > 0) {
      this.displayOverride = { until: performance.now() + holdMs, big, small, color };
    }
    this.display.draw(big, small, color);
  }

  /* ---------------------------------------------------------------- */
  /* Sequences                                                         */
  /* ---------------------------------------------------------------- */
  private async bootSequence() {
    const store = useSorter.getState();
    if (store.sound) sorterAudio.setEnabled(true);
    sorterAudio.boot();

    const bootLines = ["Calibrating optics", "Loading SIFT-V3 model", "Heating seals"];
    for (let i = 0; i < bootLines.length; i++) {
      if (this.disposed) return;
      this.setDisplay("SIFT OS", bootLines[i], "#d7f171");
      this.setLed(COL.lime, 0.4 + i * 0.5);
      await this.wait(520);
    }
    if (this.disposed) return;
    this.setLed(COL.cream, 0.65);
    this.setDisplay("READY", "All systems nominal", "#d7f171", 2600);
    useSorter.getState().setStatus("ready", "Ready");
    this.lastSortAt = performance.now();
  }

  /** Public: enqueue a toss. Returns immediately. */
  toss(def: WasteItemDef) {
    if (this.disposed) return;
    if (this.queue.length > 6) return; // shed load
    this.queue.push(def);
    this.pipeline = this.pipeline
      .then(() => this.processQueue())
      .catch(() => {
        /* sequence cancelled — keep pipeline alive */
      });
  }

  private async processQueue() {
    const def = this.queue.shift();
    if (!def || this.disposed) return;
    this.busy = true;
    try {
      await this.sortSequence(def);
    } finally {
      this.busy = false;
      this.lastSortAt = performance.now();
    }
  }

  private async sortSequence(def: WasteItemDef) {
    const store = useSorter.getState();
    useSorter.getState().beginScan(def);
    sorterAudio.toss();

    /* 1 — fly in */
    const mesh = this.buildItem(def.shape);
    mesh.rotation.set(0, Math.random() * Math.PI, 0);
    mesh.position.copy(SPAWN);
    this.scene.add(mesh);
    this.activeItem = mesh;
    this.label.sprite.visible = true;
    this.label.sprite.position.set(HOVER.x, HOVER.y + 0.62, HOVER.z);
    this.label.draw("INCOMING", def.tag, "#d7f171");

    const start = SPAWN.clone();
    const end = HOVER.clone();
    await this.tween(0.7, easeInOutCubic, (k) => {
      mesh.position.lerpVectors(start, end, k);
      mesh.position.y += Math.sin(k * Math.PI) * 0.5;
      mesh.rotation.y = k * Math.PI * 1.5;
    });
    if (this.disposed) return;

    /* 2 — hover bob + scan */
    this.bobbing = true;
    this.label.draw("SCANNING", "depth · NIR · weight", "#d7f171");
    this.setLed(COL.lime, 1.4);
    this.setDisplay("SCANNING", def.label, "#d7f171", 2400);
    sorterAudio.scan();

    // scan cone
    this.scanCone.visible = true;
    this.scanCone.position.set(HOVER.x, HOVER.y + 0.52, HOVER.z);
    await this.tween(0.3, easeOutCubic, (k) => {
      (this.scanCone.material as THREE.MeshBasicMaterial).opacity = k * 0.28;
      this.scanCone.scale.setScalar(0.6 + k * 0.4);
    });
    if (this.disposed) return;

    // sweeping plane
    this.scanPlane.visible = true;
    const scanTexMat = this.scanPlane.material as THREE.MeshBasicMaterial;
    scanTexMat.opacity = 0.85;
    for (let pass = 0; pass < 2; pass++) {
      await this.tween(0.5, easeInOutCubic, (k) => {
        this.scanPlane.position.set(HOVER.x, 2.86 - k * 0.95, HOVER.z);
      });
      if (this.disposed) return;
    }
    scanTexMat.opacity = 0;
    this.scanPlane.visible = false;

    /* 3 — bbox + identify */
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    this.bbox.position.copy(center);
    this.bbox.scale.set(size.x + 0.14, size.y + 0.14, size.z + 0.14);
    this.bbox.visible = true;
    const bboxMat = this.bbox.material as THREE.LineBasicMaterial;

    let confidence = Math.min(0.999, def.confidence + (Math.random() - 0.5) * 0.012);
    const confText = `${Math.round(confidence * 1000) / 10}%`;
    useSorter.getState().setLiveConfidence(confidence);

    await this.tween(0.35, easeOutCubic, (k) => {
      bboxMat.opacity = k * 0.95;
    });
    if (this.disposed) return;

    // type out label + count confidence
    const catMeta = CATEGORIES[def.category];
    const fullTitle = def.label;
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      if (this.disposed) return;
      const shown = fullTitle.slice(0, Math.round((i / steps) * fullTitle.length));
      const c = Math.round((i / steps) * confidence * 1000) / 10;
      this.label.draw(shown || "…", `${c.toFixed(1)}% confidence`, "#d7f171");
      await this.wait(46);
    }
    if (this.disposed) return;

    let finalCategory = def.category;
    let source: "edge" | "human" | "cloud" = "edge";
    let note = def.note;

    /* special — contamination */
    if (def.special === "contamination") {
      sorterAudio.alert();
      this.setLed(CATEGORY_HEX.hazard, 1.6);
      this.label.setColor("#b26e92");
      this.label.draw("LIQUID DETECTED", "checking contamination…", "#b26e92");
      this.setDisplay("CONTAMINANT", "residual liquid found", "#b26e92", 2600);
      await this.wait(1150);
      if (this.disposed) return;
      note = def.note;
      this.label.setColor("#d7f171");
    }

    /* special — low confidence review */
    if (def.special === "review" && def.candidates) {
      this.reviewWasHuman = false;
      this.label.setColor("#e3b341");
      this.label.draw("LOW CONFIDENCE", `${confText} — review`, "#e3b341");
      this.setLed(CATEGORY_HEX.recyclable, 1.5);
      this.setDisplay("REVIEW", "needs human input", "#e3b341", 3000);
      sorterAudio.alert();
      useSorter.getState().requestReview({
        itemId: def.id,
        label: def.label,
        confidence: confidence,
        candidates: def.candidates,
      });

      const chosen = await new Promise<Category>((resolve) => {
        this.reviewResolver = resolve;
        this.reviewTimer = setTimeout(() => resolve(def.category), 45000);
      });
      this.reviewResolver = null;
      if (this.reviewTimer) clearTimeout(this.reviewTimer);
      if (this.disposed) return;
      useSorter.getState().resolveReview();

      finalCategory = chosen;
      source = this.reviewWasHuman ? "human" : "edge";
      note =
        chosen === def.category
          ? "You confirmed General — laminate logged as non-recyclable."
          : "You routed it to Recyclables — logged as an education data point.";
      this.label.setColor("#d7f171");
    }

    /* 4 — route to compartment */
    const catMetaFinal = CATEGORIES[finalCategory];
    this.bobbing = false; // stop hovering — the item is about to be routed & dropped
    this.label.draw(catMetaFinal.short, `${confText} · routing`, catMetaFinal.color);
    this.setLed(CATEGORY_HEX[finalCategory], 1.5);
    this.setDisplay(catMetaFinal.short, `${confText} confidence`, cssToHex(CATEGORY_HEX[finalCategory]), 2600);

    const target = APERTURE[finalCategory];
    const dropX = target.x;
    const dropZ = target.z;

    const routeStart = mesh.position.clone();
    const routeEnd = new THREE.Vector3(dropX, HOVER.y, dropZ);
    await this.tween(0.65, easeInOutCubic, (k) => {
      mesh.position.lerpVectors(routeStart, routeEnd, k);
      mesh.position.y += Math.sin(k * Math.PI) * 0.22;
    });
    if (this.disposed) return;

    /* fade FX */
    await this.tween(0.3, easeOutCubic, (k) => {
      bboxMat.opacity = 0.95 * (1 - k);
      (this.label.sprite.material as THREE.SpriteMaterial).opacity = 1 - k;
      (this.scanCone.material as THREE.MeshBasicMaterial).opacity = 0.28 * (1 - k);
    });
    this.bbox.visible = false;
    this.scanCone.visible = false;
    this.label.sprite.visible = false;
    this.label.sprite.material.opacity = 1;
    this.label.setColor("#d7f171");
    if (this.disposed) return;

    /* open lid or drawer */
    if (finalCategory === "hazard") {
      if (!this.drawerOut) {
        sorterAudio.servo(true);
        await this.tween(0.45, easeOutCubic, (k) => {
          this.drawer.position.z = k * 0.42;
        });
        this.drawerOut = true;
      } else {
        sorterAudio.servo(true);
        await this.wait(200);
      }
    } else {
      const lidData = this.lids[finalCategory];
      sorterAudio.servo(true);
      await this.tween(0.4, easeOutBack, (k) => {
        lidData.pivot.rotation.x = -1.9 * k;
      });
    }
    if (this.disposed) return;

    /* drop */
    const pile = this.piles[finalCategory];
    const pileTop = Math.min(0.06 + pile.count * 0.055, 0.6);
    const dropTarget =
      finalCategory === "hazard"
        ? new THREE.Vector3(
            dropX + (Math.random() - 0.5) * 0.2,
            0.44 + pileTop,
            this.drawer.position.z + 0.66 + (Math.random() - 0.5) * 0.16
          )
        : new THREE.Vector3(
            dropX + (Math.random() - 0.5) * 0.16,
            0.42 + pileTop,
            dropZ + (Math.random() - 0.5) * 0.12
          );
    const dropStart = mesh.position.clone();
    const startRot = mesh.rotation.z;
    await this.tween(0.42, easeInQuad, (k) => {
      mesh.position.lerpVectors(dropStart, dropTarget, k);
      mesh.rotation.z = startRot + k * 0.5 * (Math.random() > 0.5 ? 1 : -1);
    });
    sorterAudio.drop();

    /* settle into pile */
    this.scene.remove(mesh);
    pile.group.add(mesh);
    mesh.position.sub(pile.group.getWorldPosition(new THREE.Vector3()));
    mesh.rotation.set(
      (Math.random() - 0.5) * 0.5,
      Math.random() * Math.PI,
      (Math.random() - 0.5) * 0.4
    );
    // cap visible pile (dispose oldest)
    pile.count += 1;
    if (pile.group.children.length > 9) {
      const oldest = pile.group.children[0] as THREE.Mesh;
      pile.group.remove(oldest);
      oldest.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else mat?.dispose();
        }
      });
    }
    this.activeItem = null;

    if (this.disposed) return;

    /* stats + log */
    useSorter.getState().registerSort(def, finalCategory, confidence, source, note);
    sorterAudio.chime();

    /* close lid / drawer */
    await this.wait(260);
    if (finalCategory === "hazard") {
      await this.tween(0.4, easeInOutCubic, (k) => {
        this.drawer.position.z = 0.42 * (1 - k);
      });
      this.drawerOut = false;
    } else {
      const lidData = this.lids[finalCategory];
      sorterAudio.servo(false);
      await this.tween(0.35, easeInOutCubic, (k) => {
        lidData.pivot.rotation.x = -1.9 * (1 - k);
      });
    }
    this.setLed(COL.cream, 0.65);
  }

  /** Called by HUD when the human confirms a review choice. */
  resolveReview(category: Category) {
    this.reviewWasHuman = true;
    this.reviewResolver?.(category);
  }

  /** Dev/debug: JSON snapshot of pile + lid state for browser-console inspection. */
  debugState() {
    const v = new THREE.Vector3();
    const piles: Record<string, { world: number[]; count: number; children: number[] }> = {};
    for (const key of Object.keys(this.piles)) {
      const p = this.piles[key];
      const kids = p.group.children.map((c) => {
        const wp = c.getWorldPosition(v.clone());
        return [ +wp.x.toFixed(2), +wp.y.toFixed(2), +wp.z.toFixed(2) ];
      });
      piles[key] = {
        world: Array.from(p.group.getWorldPosition(v.clone()).toArray()).map((n) => +n.toFixed(2)),
        count: p.count,
        children: kids as unknown as number[],
      };
    }
    const lids: Record<string, number> = {};
    for (const key of Object.keys(this.lids)) {
      lids[key] = +this.lids[key].pivot.rotation.x.toFixed(2);
    }
    return { piles, lids, drawerZ: +this.drawer.position.z.toFixed(2) };
  }

  setFeedVisible(v: boolean) {
    this.feedVisible = v;
  }

  /** Clear all compartment piles (session reset). */
  clearPiles() {
    for (const key of Object.keys(this.piles)) {
      const p = this.piles[key];
      for (const child of [...p.group.children]) {
        p.group.remove(child as THREE.Mesh);
        (child as THREE.Mesh).traverse?.((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.geometry?.dispose();
            const mat = m.material as THREE.Material | THREE.Material[];
            if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
            else mat?.dispose();
          }
        });
      }
      p.count = 0;
    }
    this.setLed(COL.cream, 0.65);
  }

  /* ---------------------------------------------------------------- */
  /* X-ray                                                             */
  /* ---------------------------------------------------------------- */
  private applyXray(on: boolean) {
    for (const m of this.shellMats) {
      m.transparent = on;
      m.opacity = on ? 0.16 : 1;
      m.depthWrite = !on;
      m.needsUpdate = true;
    }
    for (const m of this.tubMats) {
      m.opacity = on ? 0.5 : 0.32;
      m.needsUpdate = true;
    }
    const em = this.edgeLines.material as THREE.LineBasicMaterial;
    em.opacity = on ? 0.85 : 0;
  }

  /* ---------------------------------------------------------------- */
  /* AI camera feed                                                    */
  /* ---------------------------------------------------------------- */
  attachFeed(overlay: HTMLCanvasElement) {
    this.feedOverlay = overlay;
  }

  private drawFeedOverlay() {
    if (!this.feedOverlay || this.disposed) return;
    const ctx = this.feedOverlay.getContext("2d");
    if (!ctx) return;
    const w = this.feedOverlay.width;
    const h = this.feedOverlay.height;
    ctx.clearRect(0, 0, w, h);

    const state = useSorter.getState();
    const scanning = state.status === "scanning" || state.status === "review";

    // grid
    ctx.strokeStyle = "rgba(215,241,113,0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // bounding box of active item
    if (this.activeItem && state.currentItemId) {
      const box = new THREE.Box3().setFromObject(this.activeItem);
      const corners: THREE.Vector3[] = [];
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      let visible = true;
      for (const c of corners) {
        const p = c.clone().project(this.feedCamera);
        if (p.z < -1 || p.z > 1) visible = false;
        const sx = (p.x * 0.5 + 0.5) * w;
        const sy = (-p.y * 0.5 + 0.5) * h;
        minX = Math.min(minX, sx);
        maxX = Math.max(maxX, sx);
        minY = Math.min(minY, sy);
        maxY = Math.max(maxY, sy);
      }
      if (visible) {
        const pad = 6;
        minX -= pad;
        minY -= pad;
        maxX += pad;
        maxY += pad;
        ctx.strokeStyle = "#d7f171";
        ctx.lineWidth = 1.6;
        const cl = Math.min(14, (maxX - minX) / 3, (maxY - minY) / 3);
        // corner brackets
        for (const [cx, cy, dx, dy] of [
          [minX, minY, 1, 1],
          [maxX, minY, -1, 1],
          [minX, maxY, 1, -1],
          [maxX, maxY, -1, -1],
        ] as const) {
          ctx.beginPath();
          ctx.moveTo(cx + dx * cl, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy + dy * cl);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(215,241,113,0.9)";
        ctx.font = "600 10px 'JetBrains Mono', monospace";
        const label = state.statusDetail.toUpperCase().slice(0, 18) || "TRACKING";
        ctx.fillText(label, minX, Math.max(10, minY - 5));
      }
    }

    // REC-style header
    ctx.fillStyle = "rgba(215,241,113,0.75)";
    ctx.font = "600 9px 'JetBrains Mono', monospace";
    ctx.fillText("SIFT-V3 · 640×400 · IR", 8, 12);
    if (scanning && Math.floor(performance.now() / 400) % 2 === 0) {
      ctx.fillStyle = "#d7f171";
      ctx.beginPath();
      ctx.arc(w - 12, 9, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText("REC", w - 34, 12);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Loop / lifecycle                                                  */
  /* ---------------------------------------------------------------- */
  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    this.lastFrameAt = performance.now();
    this.loopBody();
  };

  private loopBody = () => {
    if (this.disposed) return;
    const realDt = this.clock.getDelta();
    const dt = Math.min(realDt, 0.05);
    const t = this.clock.elapsedTime;

    // tweens — driven by wall-clock time so sequences stay correct
    // even on throttled/background frames (dt cap only applies to effects)
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      if (tw.delay > 0) {
        tw.delay -= realDt;
        continue;
      }
      tw.elapsed += realDt;
      const k = Math.min(1, tw.elapsed / tw.dur);
      tw.onUpdate(tw.ease(k));
      if (k >= 1) {
        this.tweens.splice(i, 1);
        tw.resolve();
      }
    }

    // idle bob of active item (only while waiting over the scan zone)
    if (this.activeItem && this.bobbing && this.tweens.length === 0) {
      this.activeItem.position.y = HOVER.y + Math.sin(t * 2.2) * 0.045;
      this.activeItem.rotation.y += dt * 0.5;
      this.label.sprite.position.set(
        this.activeItem.position.x,
        this.activeItem.position.y + 0.62,
        this.activeItem.position.z
      );
      this.bbox.position.y = this.activeItem.position.y;
    }

    // LED breathing when ready
    const st = useSorter.getState().status;
    if (st === "ready") {
      const breathe = 0.5 + Math.sin(t * 1.8) * 0.16;
      const m = this.ledRing.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = breathe;
      (this.ledStrip.material as THREE.MeshStandardMaterial).emissiveIntensity = breathe;
    }

    // auto demo
    if (useSorter.getState().autoDemo && st === "ready" && !this.busy && this.queue.length === 0) {
      this.autoTimer += realDt;
      if (this.autoTimer > 4.4 && performance.now() - this.lastSortAt > 4200) {
        this.autoTimer = 0;
        const pick = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        this.toss(pick);
      }
    } else {
      this.autoTimer = 0;
    }

    // display override revert
    if (this.displayOverride && performance.now() > this.displayOverride.until) {
      this.displayOverride = null;
      const s = useSorter.getState();
      this.display.draw(
        s.status === "ready" ? "READY" : s.status.toUpperCase(),
        s.statusDetail,
        "#d7f171"
      );
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    // AI feed
    if (this.feedOverlay && this.feedVisible && !document.hidden) {
      this.feedRenderer.render(this.scene, this.feedCamera);
      this.drawFeedOverlay();
    }
  };

  resize() {
    if (this.disposed || !this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    if (this.fallbackTimer) clearInterval(this.fallbackTimer);
    this.reviewResolver?.(useSorter.getState().review?.candidates?.[0] ?? "general");
    this.unsubStore?.();
    this.resizeObs?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
    this.feedRenderer?.dispose();
    this.renderer?.domElement?.remove();
    this.feedCanvas?.remove();
    this.scene?.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
  }
}

/* helpers ------------------------------------------------------------ */
function cssToHex(num: number): string {
  return `#${num.toString(16).padStart(6, "0")}`;
}
