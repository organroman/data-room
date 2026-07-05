import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "./shared"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./server/test/setup.ts"],
    fileParallelism: false,
  },
});
