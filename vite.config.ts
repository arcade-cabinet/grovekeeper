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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          // @babylonjs/loaders — GLB/glTF parser; lazy-loaded after first model
          // request, so it does NOT need to be in the initial Babylon chunk.
          if (id.includes("@babylonjs/loaders")) return "babylon-loaders";

          if (id.includes("@babylonjs/")) {
            // Exclude shader/heavy modules from the named chunk so Rollup can
            // place them in auto-generated async chunks (they may or may not be
            // needed depending on the active material pipeline).
            if (
              id.includes("/Shaders/") ||
              id.includes("/ShadersInclude/") ||
              id.includes("/ShadersWGSL/") ||
              id.includes("/FlowGraph/") ||
              id.includes("/PostProcesses/") ||
              id.includes("/Audio/") ||
              id.includes("/OpenPBR/") ||
              id.includes("/Debug/") ||
              id.includes("LoadingAdapter")
            ) {
              return undefined;
            }

            // All remaining @babylonjs/* in one named chunk.
            // Splitting core/Materials further causes Rollup circular-chunk
            // warnings because Materials and core are tightly coupled.
            return "babylon-core";
          }

          if (id.includes("node_modules/sql.js")) return "sqljs";
          if (id.includes("node_modules/tone")) return "tone";
          return undefined;
        },
      },
    },
  },
});
