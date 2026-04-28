import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin";
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

// ---------------------------------------------------------------------------
// Plugin: inline .docx files as base64 data URIs at build time.
// This avoids runtime fetch() calls which Power Apps CSP blocks:
//   connect-src is limited to *.powerplatform.com
//   but assets are served from *.powerplatformusercontent.com
// ---------------------------------------------------------------------------
function inlineBinaryPlugin(): Plugin {
  const MIME: Record<string, string> = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  return {
    name: "vite-plugin-inline-binary",
    enforce: "pre",
    load(id) {
      const ext = id.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
      if (ext && MIME[ext] && !id.includes("?")) {
        try {
          const buf = readFileSync(id);
          const b64 = buf.toString("base64");
          return `export default "data:${MIME[ext]};base64,${b64}"`;
        } catch {
          return null;
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [inlineBinaryPlugin(), react(), powerApps()],
  build: {
    // Inline memo images as base64 data URIs — avoids ALL runtime fetch() calls.
    // memo-header is ~55 kB (fine). memo-footer is ~740 kB so MemoComposer
    // must be lazy-loaded in InitiativeDetail to keep that chunk small.
    assetsInlineLimit: (filePath: string) => {
      if (filePath.includes("memo-header") || filePath.includes("memo-footer")) {
        return true;
      }
      return undefined;
    },
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("jspdf")) return "vendor-jspdf";
          if (id.includes("html2canvas")) return "vendor-canvas";
          if (id.includes("xlsx")) return "vendor-xlsx";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("react")) return "vendor-react";
        },
      },
    },
  },
});
