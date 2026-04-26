import { onCleanup, onMount } from "solid-js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * VoxelTreeCanvas — renders a single voxel-tree GLTF in a small WebGL
 * canvas. Used as the main-menu's diegetic decoration in place of the
 * old SVG ellipse-tree silhouettes. Trees auto-rotate on a slow drift
 * so the menu has gentle life without being busy.
 *
 * Source models live at `public/assets/models/trees/<id>/tree.gltf`,
 * curated from the all-trees-uploads itch.io pack (Wave 3 inventory).
 *
 * Disables itself on prefers-reduced-motion (still renders, just no spin).
 */
interface VoxelTreeCanvasProps {
  /** Tree directory under /assets/models/trees/, e.g. "tree-04". */
  treeId: string;
  /** Pixel width of the canvas. Default 220. */
  width?: number;
  /** Pixel height of the canvas. Default 280. */
  height?: number;
  /** Initial yaw in radians. */
  initialYaw?: number;
  /** Spin speed (rad/sec). 0 = still. Default 0.18. */
  spinSpeed?: number;
  /** Optional className for the wrapper. */
  class?: string;
}

export const VoxelTreeCanvas = (props: VoxelTreeCanvasProps) => {
  let canvas!: HTMLCanvasElement;
  let raf = 0;
  let disposed = false;

  onMount(() => {
    const w = props.width ?? 220;
    const h = props.height ?? 280;
    const reducedMotion = globalThis.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const spinSpeed = reducedMotion ? 0 : (props.spinSpeed ?? 0.18);

    // Degrade gracefully where WebGL isn't available (test runners, very
    // old browsers). The canvas stays empty; the menu still composes
    // around it without throwing.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 100);
    camera.position.set(0, 1.2, 6.2);
    camera.lookAt(0, 1, 0);

    // Warm dawn-key lighting that matches the menu's gradient sky
    const key = new THREE.DirectionalLight(0xfff1c8, 1.4);
    key.position.set(2, 4, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8aa896, 0.6);
    fill.position.set(-3, 1.5, 2);
    scene.add(fill);
    scene.add(new THREE.AmbientLight(0x3a5a4a, 0.55));

    const root = new THREE.Group();
    if (typeof props.initialYaw === "number") root.rotation.y = props.initialYaw;
    scene.add(root);

    // Static-fallback wireframe placeholder while the GLTF streams in,
    // so the corner doesn't visibly pop.
    const placeholder = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.6, 6),
      new THREE.MeshBasicMaterial({ color: 0x355a3f, wireframe: true }),
    );
    placeholder.position.y = 1;
    root.add(placeholder);

    const base = new URL(
      import.meta.env.BASE_URL ?? "/",
      globalThis.location.href,
    ).href;
    const url = `${base}assets/models/trees/${props.treeId}/tree.gltf`.replace(
      /\/+/g,
      "/",
    );
    // Fix the leading double-slash from URL+window.location.href on root deploys.
    const fixedUrl = url.replace("https:/", "https://").replace("http:/", "http://");

    const loader = new GLTFLoader();
    loader.load(
      fixedUrl,
      (gltf) => {
        if (disposed) return;
        root.remove(placeholder);
        placeholder.geometry.dispose();
        (placeholder.material as THREE.Material).dispose();
        const tree = gltf.scene;
        // Frame the tree: scale to fit a ~2.2-unit-tall canopy in view.
        const box = new THREE.Box3().setFromObject(tree);
        const size = new THREE.Vector3();
        box.getSize(size);
        const targetH = 2.4;
        const scale = size.y > 0 ? targetH / size.y : 1;
        tree.scale.setScalar(scale);
        // Re-frame so feet sit at y=0.
        const recomputed = new THREE.Box3().setFromObject(tree);
        tree.position.y = -recomputed.min.y;
        root.add(tree);
      },
      undefined,
      (err) => {
        // Loader failure is non-fatal; the wireframe placeholder stays.
        console.warn(`VoxelTreeCanvas: failed to load ${fixedUrl}`, err);
      },
    );

    const start = performance.now() / 1000;
    const tick = () => {
      if (disposed) return;
      const t = performance.now() / 1000 - start;
      root.rotation.y = (props.initialYaw ?? 0) + t * spinSpeed;
      // Subtle vertical breath
      root.position.y = Math.sin(t * 0.6) * 0.03;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    onCleanup(() => {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      // Walk the scene and dispose geometries/materials/textures we own.
      const collectMaterials = (m: THREE.Material | THREE.Material[] | undefined): THREE.Material[] => {
        if (Array.isArray(m)) return m;
        if (m) return [m];
        return [];
      };
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose?.();
        const mats = collectMaterials(mesh.material);
        for (const m of mats) {
          for (const k of Object.keys(m)) {
            const v = (m as unknown as Record<string, unknown>)[k];
            if (v instanceof THREE.Texture) v.dispose();
          }
          m.dispose?.();
        }
      });
    });
  });

  return (
    <canvas
      ref={canvas}
      width={props.width ?? 220}
      height={props.height ?? 280}
      class={props.class ?? ""}
      // Decorative tree visualization. tabIndex=-1 removes it from
      // keyboard-nav order. We don't add aria-hidden (lint rule
      // noAriaHiddenOnFocusable) or role=presentation (lint rule
      // noInteractiveElementToNoninteractiveRole); a non-tabbable
      // canvas is sufficiently inert for AT.
      tabIndex={-1}
    />
  );
};
