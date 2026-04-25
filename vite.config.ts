/// <reference types="vitest" />
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['expense-ai-logo.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Expense AI Mobile',
        short_name: 'Expense AI',
        description: 'Mobile-first AI expense tracker with scans, voice, budgets, and market insights',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        share_target: {
          action: '/sms-parser',
          method: 'GET',
          enctype: 'application/x-www-form-urlencoded',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        }
      }
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split heavy dependencies so initial route payload stays smaller.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('tesseract.js')) {
            return 'vendor-tesseract';
          }
          if (id.includes('@tensorflow')) {
            return 'vendor-tensorflow';
          }
          if (id.includes('html5-qrcode')) {
            return 'vendor-qrcode';
          }
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'vendor-mui';
          }
          if (id.includes('@radix-ui')) {
            return 'vendor-radix';
          }
          if (id.includes('react-dnd')) {
            return 'vendor-dnd';
          }
          if (id.includes('recharts')) {
            return 'vendor-charts';
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('react-router') || id.includes('@remix-run')) {
            return 'vendor-router';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('jspdf')) {
            return 'vendor-jspdf';
          }
          if (id.includes('html2canvas')) {
            return 'vendor-html2canvas';
          }
        },
      },
    },
  },
})
