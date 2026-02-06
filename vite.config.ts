import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  cacheDir: ".vite",
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: [
            "@babylonjs/core/Engines/engine",
            "@babylonjs/core/scene",
            "@babylonjs/core/Cameras/arcRotateCamera",
            "@babylonjs/core/Lights/hemisphericLight",
            "@babylonjs/core/Lights/directionalLight",
            "@babylonjs/core/Maths/math.vector",
            "@babylonjs/core/Maths/math.color",
            "@babylonjs/core/Meshes/mesh",
            "@babylonjs/core/Meshes/Builders/boxBuilder",
            "@babylonjs/core/Meshes/Builders/cylinderBuilder",
            "@babylonjs/core/Meshes/Builders/groundBuilder",
            "@babylonjs/core/Meshes/Builders/sphereBuilder",
            "@babylonjs/core/Meshes/Builders/discBuilder",
            "@babylonjs/core/Meshes/Builders/ribbonBuilder",
            "@babylonjs/core/Materials/standardMaterial",
            "@babylonjs/core/Materials/PBR/pbrMaterial",
            "@babylonjs/core/Materials/Textures/texture",
            "@babylonjs/core/Materials/Textures/cubeTexture",
            "@babylonjs/core/Materials/Textures/hdrCubeTexture",
            "@babylonjs/core/Particles/solidParticleSystem",
          ],
        },
      },
    },
  },
});
