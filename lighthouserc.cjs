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
 *
 * Mobile emulation is enforced by `preset: "mobile"` (Lighthouse defaults
 * to mobile when `preset` is unset, but we make it explicit here so the
 * gate cannot silently regress to desktop). A separate desktop sanity
 * snapshot can be produced ad-hoc with `lhci collect --preset=desktop`,
 * but only the mobile run is enforced as a CI gate.
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
        preset: "mobile",
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
