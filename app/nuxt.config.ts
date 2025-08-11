// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from "./package.json"

export default defineNuxtConfig( {
  devtools: { enabled: true },

  modules: [
    "@nuxtjs/tailwindcss",
    "@nuxt/eslint",
    [
      "@vee-validate/nuxt",
      {
        // disable or enable auto imports
        autoImports: false,
      },
    ],
  ],

  runtimeConfig: {
    public: {
      appVersion: pkg.version,
    },
  },

  css: [
    "primeicons/primeicons.css",
    "~/assets/custom.scss"
  ],

  routeRules: {
    "/": { redirect: "/performance" },
  },

  compatibilityDate: "2024-11-21"
} )
