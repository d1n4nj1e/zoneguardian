import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    cors: true,

    // 🔑 FIX FINAL UNTUK NGROK (SEMUA VARIAN DOMAIN)
    allowedHosts: [
      "localhost",
      ".ngrok.io",
      ".ngrok-free.app",
      ".ngrok-free.dev",
    ],

    hmr: {
      overlay: false,
    },
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
