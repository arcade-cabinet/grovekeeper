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
        manualChunks(id) {
          if (id.includes("@babylonjs/")) {
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
            return "babylon";
          }
          if (id.includes("node_modules/sql.js")) return "sqljs";
          if (id.includes("node_modules/tone")) return "tone";
        },
      },
    },
  },
});
