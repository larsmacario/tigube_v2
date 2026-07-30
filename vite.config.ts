import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.png', 'Image/Logos/tigube_logo.svg', 'Image/Logos/tigube_logo_klein.png'],
      manifest: {
        name: 'tigube',
        short_name: 'tigube',
        description: 'tierisch gut betreut – Haustierbetreuung finden und verwalten',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/nachrichten',
        lang: 'de',
        icons: [
          {
            src: '/Image/Logos/tigube_logo_klein.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/Image/Logos/tigube_logo_klein.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        manualChunks: undefined,
      },
    },
  },
});
