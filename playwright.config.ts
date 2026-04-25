import { defineConfig, devices } from "@playwright/test";

/**
 * Software-WebGL launch flags for headless Chromium.
 *
 * Without these, the Three.js / Jolly Pixel scene mount terminates the
 * page context on Apple Silicon macOS (no GPU passthrough). With them,
 * Chromium uses Google's SwiftShader CPU rasterizer which renders WebGL
 * deterministically across machines — the cost is FPS (~30 instead of
 * 60), which is fine for screenshot capture and acceptable for the
 * coarse FPS budget check in the perf suite.
 *
 *   --use-gl=swiftshader            — force the SwiftShader GL backend
 *   --enable-unsafe-swiftshader     — required by recent Chromium to
 *                                     opt into the CPU-rasterizer path
 *   --ignore-gpu-blocklist          — bypass GPU blocklist heuristics so
 *                                     SwiftShader is actually selected
 */
const SWIFTSHADER_ARGS = [
  "--use-gl=swiftshader",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  // Co-locate journey baselines in e2e/rc-journey-baselines/ instead of
  // Playwright's default `<spec>-snapshots/` directory. This matches the
  // BASELINES_DIR constant in e2e/rc-journey.spec.ts and keeps committed
  // baselines under one well-known path that's easy to .gitattributes-LFS.
  snapshotPathTemplate:
    "{testDir}/rc-journey-baselines/{arg}{-projectName}{ext}",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    launchOptions: {
      args: SWIFTSHADER_ARGS,
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: SWIFTSHADER_ARGS,
        },
      },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        launchOptions: {
          args: SWIFTSHADER_ARGS,
        },
      },
    },
  ],
  webServer: {
    command: "pnpm preview --port 4173",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
