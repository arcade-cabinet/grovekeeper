import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/grovekeeper/" : "/",
  cacheDir: ".vite",
  plugins: [
    solid(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/sql.js/dist/sql-wasm.wasm",
          dest: "sql-wasm",
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "three",
      "@jolly-pixel/engine",
      "@jolly-pixel/runtime",
      "@jolly-pixel/voxel.renderer",
    ],
    // rapier3d ships its WASM via a static bundler import
    // (`import * as wasm from "./rapier_wasm3d_bg.wasm"`). Vite serves
    // the .wasm file directly when the package is excluded from
    // pre-bundling — that's the rapier-recommended setup. Mirrors
    // voxel-realms' Vite config.
    exclude: ["@dimforge/rapier3d"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (id.includes("node_modules/sql.js")) return "sqljs";
          if (id.includes("node_modules/three")) return "three";
          if (id.includes("node_modules/@jolly-pixel/")) return "jolly-pixel";
          return undefined;
        },
      },
    },
  },
});
