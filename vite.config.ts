import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Warn when individual chunks exceed 200KB (uncompressed)
    chunkSizeWarningLimit: 200,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached long-term, rarely changes
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI primitives — large but shared across all pages
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-accordion",
            "@radix-ui/react-popover",
          ],
          // Heavy animation library — only bundle when actually used
          "vendor-motion": ["framer-motion"],
          // Charting — dashboard-only, don't ship to landing page visitors
          "vendor-charts": ["recharts"],
          // Supabase client
          "vendor-supabase": ["@supabase/supabase-js"],
          // Data fetching
          "vendor-query": ["@tanstack/react-query"],
          // Form utilities
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
  },
}));
