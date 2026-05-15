// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  modules: ['@nuxt/ui', '@nuxtjs/supabase', '@vite-pwa/nuxt'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Finance Tracker',
      short_name: 'Finance',
      theme_color: '#000000',
      icons: [
        {
          src: 'fn-icon.png',
          sizes: '192x192 512x512',
          type: 'image/svg+xml',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/$/],
      type: 'module',
    },
  },
  supabase: {
    redirect: false
  },
  runtimeConfig: {
    public: {
      baseURL: process.env.BASE_URL ?? 'http://localhost:3000'
    }
  }
})