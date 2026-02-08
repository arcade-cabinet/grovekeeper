import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/grovekeeper/" : "/",
  cacheDir: ".vite",
  plugins: [
    react(),
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
            // Keep shader/material/debug chunks lazy-loaded
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
        },
      },
    },
  },
});
