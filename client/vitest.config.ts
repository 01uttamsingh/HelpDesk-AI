import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const rootReact = path.resolve(import.meta.dirname, "../node_modules/react");
const rootReactDom = path.resolve(import.meta.dirname, "../node_modules/react-dom");

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 15000,
    css: false,
  },
  resolve: {
    alias: [
      { find: /^react$/, replacement: rootReact },
      { find: /^react-dom$/, replacement: rootReactDom },
      { find: /^react\/(.*)$/, replacement: `${rootReact}/$1` },
      { find: /^react-dom\/(.*)$/, replacement: `${rootReactDom}/$1` },
      { find: "@", replacement: path.resolve(import.meta.dirname, "./src") },
    ],
    dedupe: ["react", "react-dom"],
  },
});
