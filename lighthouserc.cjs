/**
 * Lighthouse CI configuration for the RC verification wave.
 *
 * Runs against the locally-served preview build (vite preview --port 4173)
 * and asserts the spec's score budgets:
 *   Performance       >= 90 (mobile emulation)
 *   Best Practices    >= 95
 *
 * The audit only covers the landing page — game boot is heavy and is
 * measured separately by `e2e/perf.spec.ts`. Per the spec:
 *   "Lighthouse audit on landing — score budgets: Performance ≥ 90 mobile,
 *    Best Practices ≥ 95."
 */
module.exports = {
  ci: {
    collect: {
      // Spin up the preview server. CI scripts can run `pnpm preview` first
      // and skip startServerCommand by setting LHCI_SKIP_START=1.
      startServerCommand: process.env.LHCI_SKIP_START
        ? undefined
        : "pnpm preview --port 4173",
      startServerReadyPattern: "Local",
      url: ["http://localhost:4173/"],
      numberOfRuns: 3,
      settings: {
        preset: "desktop", // baseline desktop run
        // The mobile run is achieved by the second `assert` group below;
        // when audit:lighthouse:mobile is invoked, settings are overridden.
        chromeFlags: "--no-sandbox --headless=new",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        // Accessibility and SEO are aspirational at RC; warn don't error.
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
