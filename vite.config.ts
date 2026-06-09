import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/smarthomemom/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'maskable-icon.png'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
      manifest: {
        id: "/smarthomemom/",
        name: "SmartHomeMom - Chi Tiêu & Thực Đơn Gia Đình",
        short_name: "SmartHomeMom",
        description: "Ứng dụng quản lý tài chính và gợi ý thực đơn thông minh cho các mẹ nội trợ.",
        theme_color: "#FF8C69",
        background_color: "#FFFDF9",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/smarthomemom/",
        scope: "/smarthomemom/",
        lang: "vi",
        categories: ["finance", "lifestyle"],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshots/screenshot-dashboard.png',
            sizes: '828x1792',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Trang chủ - Quản lý thu chi gia đình'
          },
          {
            src: 'screenshots/screenshot-menu.png',
            sizes: '828x1792',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Thực đơn tuần - Gợi ý bữa ăn bởi AI'
          }
        ]
      }
    })
  ]
})
