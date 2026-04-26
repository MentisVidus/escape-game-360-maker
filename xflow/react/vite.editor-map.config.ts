import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";

import react from "@vitejs/plugin-react";
import type { ViteDevServer } from "vite";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoJsRoot = path.resolve(__dirname, "../../js");

/** Même plugin que `vite.config.ts` si un jour le bundle référence du legacy sous `/js/`. */
function serveRepoJsPlugin() {
  return {
    name: "serve-repo-js-under-slash-js-editor-map",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        try {
          const raw = req.url?.split("?")[0] ?? "";
          if (!raw.startsWith("/js/")) {
            next();
            return;
          }
          const rel = decodeURIComponent(raw.slice("/js/".length));
          if (!rel || rel.includes("..") || path.isAbsolute(rel)) {
            res.statusCode = 403;
            res.end();
            return;
          }
          const abs = path.resolve(path.join(repoJsRoot, rel));
          const rootResolved = path.resolve(repoJsRoot);
          const relToRoot = path.relative(rootResolved, abs);
          if (relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) {
            res.statusCode = 403;
            res.end();
            return;
          }
          if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
            res.statusCode = 404;
            res.end();
            return;
          }
          const ext = path.extname(abs).toLowerCase();
          res.setHeader(
            "Content-Type",
            ext === ".js" ? "application/javascript; charset=utf-8" : "application/octet-stream"
          );
          fs.createReadStream(abs).pipe(res);
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  /** Évite `ReferenceError: process is not defined` dans l’IIFE navigateur (React / deps). */
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [serveRepoJsPlugin(), react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/editor-map-main.tsx"),
      name: "Escape360EditorNodalMap",
      formats: ["iife"],
      fileName: () => "editor-map.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        assetFileNames: "editor-map[extname]",
        /** Polyfill minimal si une dépendance lit `process` hors `process.env`. */
        banner:
          "typeof globalThis!=='undefined'&&typeof globalThis.process==='undefined'&&(globalThis.process={env:{NODE_ENV:'production'}});",
      },
    },
  },
});
