import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * Chrome Extension build â€?three separate passes:
 *
 * 1. "pages"  â†?popup.html, options.html (code-split OK, loaded as HTML pages)
 * 2. "background" â†?background.js (self-contained IIFE, no sibling imports)
 * 3. "content" â†?content.js (self-contained IIFE, no sibling imports, CSS inlined)
 *
 * Content and background MUST be single-file bundles because Chrome extension
 * content scripts and service workers cannot reliably import sibling modules.
 */

function inlineCSSPlugin(): Plugin {
  return {
    name: "inline-css",
    generateBundle(_options, bundle) {
      const cssFile = Object.keys(bundle).find((k) => k.endsWith(".css"));
      if (!cssFile) return;
      const cssAsset = bundle[cssFile];
      if (cssAsset.type !== "asset") return;
      const css = typeof cssAsset.source === "string" ? cssAsset.source : "";
      const jsFile = Object.keys(bundle).find((k) => k === "content.js");
      if (!jsFile) return;
      const jsChunk = bundle[jsFile];
      if (jsChunk.type !== "chunk") return;
      const cssInjection = `(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(css)};(document.head||document.documentElement).appendChild(s);})();`;
      jsChunk.code = cssInjection + "\n" + jsChunk.code;
      delete bundle[cssFile];
    },
  };
}

export default defineConfig(({ mode }) => {
  const alias = { "@": resolve(__dirname, "src") };
  const define = { __DEV__: false, "process.env.NODE_ENV": '"production"' };

  // ---- Content script ----
  if (mode === "content") {
    return {
      plugins: [react(), inlineCSSPlugin()],
      resolve: { alias },
      build: {
        outDir: "dist",
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, "src/content/index.ts"),
          formats: ["iife"],
          name: "TapclosedContent",
          fileName: () => "content",
        },
        rollupOptions: { output: { extend: true, entryFileNames: "content.js" } },
        target: "es2020",
        minify: "esbuild",
        sourcemap: false,
        cssCodeSplit: false,
      },
      define,
    };
  }

  // ---- Background service worker ----
  if (mode === "background") {
    return {
      plugins: [react()],
      resolve: { alias },
      build: {
        outDir: "dist",
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, "src/background/index.ts"),
          formats: ["iife"],
          name: "TapclosedBG",
          fileName: () => "background",
        },
        rollupOptions: { output: { extend: true, entryFileNames: "background.js" } },
        target: "es2020",
        minify: "esbuild",
        sourcemap: false,
      },
      define,
    };
  }

  // ---- Pages (popup + options) ----
  return {
    plugins: [react()],
    resolve: { alias },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, "popup.html"),
          options: resolve(__dirname, "options.html"),
        },
        output: {
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
      target: "es2020",
      minify: "esbuild",
      sourcemap: false,
    },
    define,
  };
});
