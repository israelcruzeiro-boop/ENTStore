import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    dyadComponentTagger(), 
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: [
          '**/vendor-pdf-*.js',
          '**/vendor-xlsx-*.js',
          '**/vendor-charts-*.js',
          '**/vendor-forms-*.js',
          '**/vendor-motion-*.js',
          '**/vendor-tour-*.js',
          '**/vendor-validation-*.js',
          '**/spreadsheet-*.js',
          '**/Viewer-*.js',
          '**/CoursePlayer-*.js',
          '**/CourseDashboard-*.js',
          '**/CourseDetails-*.js',
          '**/ChecklistDashboard-*.js',
          '**/ChecklistSubmissionDetail-*.js',
          '**/RepositoryContents-*.js',
          '**/SurveyDashboard-*.js',
          '**/Users-*.js',
          '**/Structure-*.js',
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'runtime-js-chunks',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Store Page',
        short_name: 'Store Page',
        description: 'Gerenciamento de Checklists e Conformidade',
        theme_color: '#FF4D00',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    modulePreload: false,
    chunkSizeWarningLimit: 1000, // Aumentado para 1MB para evitar falsos positivos nos avisos
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('vite/preload-helper')) return 'vendor-core';
          if (id.includes('node_modules')) {
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('react-joyride')) return 'vendor-tour';
            if (id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-forms';
            if (id.includes('zod')) return 'vendor-validation';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('@radix-ui')) return 'vendor-ui';
            if (id.includes('date-fns')) return 'vendor-utils';
            return 'vendor-core';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
