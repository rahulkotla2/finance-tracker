// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/ui', '@nuxtjs/supabase'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  supabase: {
    redirect: true
  },
  runtimeConfig: {
    public: {
      baseURL: process.env.BASE_URL ?? 'http://localhost:3000'
    }
  }
})