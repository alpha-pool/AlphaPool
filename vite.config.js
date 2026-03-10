import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import base44 from '@base44/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Only active when VITE_BASE44_APP_BASE_URL is set (Base44 environment)
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true,
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});