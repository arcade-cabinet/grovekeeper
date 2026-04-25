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
 * Mobile emulation is the Lighthouse default — when `preset` is unset
 * Lighthouse audits with Moto G Power emulation + slow 4G throttling.
 * Lighthouse's valid presets are `perf`, `experimental`, and `desktop`;
 * there is no named "mobile" preset (passing one fails with "Invalid
 * values: preset"). To keep mobile gating, simply omit `preset`. A
 * separate desktop sanity snapshot can be produced ad-hoc with
 * `lhci collect --preset=desktop`, but only the implicit-mobile run is
 * enforced as a CI gate.
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
        // No preset → Lighthouse default mobile emulation (Moto G Power,
        // slow 4G). See doc-comment above for rationale.
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
