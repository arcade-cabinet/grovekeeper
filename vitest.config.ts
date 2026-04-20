import path from "node:path";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  resolve: {
    conditions: ["development", "browser"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "happy-dom",
          globals: true,
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["src/**/*.browser.{test,spec}.{ts,tsx}"],
          setupFiles: ["src/test/setup.ts"],
          server: {
            deps: {
              inline: [/solid-js/, /@solidjs\/testing-library/],
            },
          },
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          globals: true,
          include: ["src/**/*.browser.{test,spec}.{ts,tsx}"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
