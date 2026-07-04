import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(import.meta.dirname, "./frontend"),
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
      "/api": "http://localhost:3001",
    },
  },
});
