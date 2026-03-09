import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "pwa-icon-192.png", "pwa-icon-512.png", "fonts/*.ttf"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,ttf}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      manifest: {
        name: "MARTE — ბიზნესის მართვის სისტემა",
        short_name: "MARTE",
        description: "MARTE — სრულფასოვანი ERP/POS სისტემა თქვენი ბიზნესის მართვისთვის",
        theme_color: "#1a1f2e",
        background_color: "#1a1f2e",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        categories: ["business", "productivity"],
        shortcuts: [
          {
            name: "POS სისტემა",
            short_name: "POS",
            url: "/pos",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "პროდუქტები",
            short_name: "პროდუქტები",
            url: "/products",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "გაყიდვები",
            short_name: "გაყიდვები",
            url: "/sales",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192" }],
          },
        ],
        icons: [
          {
            src: "pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
