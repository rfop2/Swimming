// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig( {
  devtools: { enabled: true },

  modules: [
    "@nuxtjs/tailwindcss",
    "@primevue/nuxt-module",
    "@nuxt/eslint"
  ],

  primevue: {
    options: {
      unstyled: true,
    }
  },

  css: [
    "primeicons/primeicons.css",
    "~/assets/custom.scss"
  ],

  routeRules: {
    "/": { redirect: "/performance" },
  },

  compatibilityDate: "2024-07-03"
} )
