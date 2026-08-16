import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import "dotenv/config";

const apiPort = process.env.NEST_PORT ?? 3001;

export default defineConfig({
  root: path.resolve(import.meta.dirname, "./frontend"),
  // .env lives at the repo root (shared with the backend's dotenv/config loading), not
  // under frontend/ — Vite defaults envDir to `root`, so this has to be set explicitly.
  envDir: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./frontend/src"),
      "@shared": path.resolve(import.meta.dirname, "./shared"),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "./dist"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": `http://localhost:${apiPort}`,
    },
  },
});
