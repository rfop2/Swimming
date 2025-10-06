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
    "@nuxtjs/seo",
  ],

  plugins: [
    "~/plugins/temporal.client.ts",
  ],

  app: {
    head: {
      meta: [
        {
          "charset": "utf-8"
        }
      ]
    },
  },

  site: {
    url: "https://swim.racing",
    name: "Swim.Racing",
    description: "Swimmer and swim club management and performance tracking",
    defaultLocale: "en", // not needed if you have @nuxtjs/i18n installed
    indexable: process.env.NODE_ENV === "production",
  },

  vite: {
    ssr: {
      external: [ "crypto" ]
    }
  },

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

  typescript: {
    tsConfig: {
      include: [ "types/**/*.d.ts" ]
    }
  },

  compatibilityDate: "2024-11-21"
} )
