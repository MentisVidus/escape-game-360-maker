import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Bundle ES module + CSS for inclusion depuis editeur.html (chemins relatifs racine repo). */
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: "index.html",
      output: {
        format: "es",
        entryFileNames: "editor-map.js",
        assetFileNames: "editor-map[extname]",
        inlineDynamicImports: true,
      },
    },
  },
});
