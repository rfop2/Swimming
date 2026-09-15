// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from "./package.json"
import { createRequire } from "module"
import { visualizer } from "rollup-plugin-visualizer"

// ESM-safe way to access Node builtins
const require = createRequire( import.meta.url )
const builtinModules = require( "module" ).builtinModules

const siteUrl =
  process.env.SITE_URL ??
  ( process.env.NUXT_HOST && process.env.NUXT_PORT
    ? `http://${process.env.NUXT_HOST}:${process.env.NUXT_PORT}`
    : "http://localhost:3000" )
const siteName = process.env.SITE_NAME ?? "Swim.Racing"

export default defineNuxtConfig( {
  nitro: {
    publicAssets: [
      { baseURL: "/uploads", dir: "public/uploads" }
    ]
  },

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
    "@nuxtjs/turnstile",
    [
      "@sentry/nuxt/module",
      {
        org: "web2wire-ltd",
        project: "swim-racing",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: pkg.version }
      }
    ],
    "@nuxt/fonts"
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
    url: siteUrl,
    name: siteName,
    description: "Swimmer and swim club management and performance tracking",
    defaultLocale: "en", // not needed if you have @nuxtjs/i18n installed
    indexable: process.env.NODE_ENV === "production",
  },

  sitemap: {
    zeroRuntime: true
  },

  vite: {
    optimizeDeps: {
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "temporal-polyfill",
        "date-fns",
        "classnames", // CJS
        "@headlessui/vue",
        "seedrandom", // CJS
        "socks-proxy-agent", // CJS
        "mysql2/promise", // CJS
        "vue-chartjs",
        "chart.js",
        "chartjs-adapter-date-fns",
        "chartjs-plugin-annotation",
        "@heroicons/vue/24/outline",
        "@heroicons/vue/20/solid",
        "ag-grid-community",
        "ag-grid-vue3",
        "yup",
        "@vee-validate/yup",
        "@schedule-x/calendar",
        "@schedule-x/event-modal",
        "@schedule-x/events-service",
        "@schedule-x/vue",
      ]
    },
    plugins: [
      {
        name: "externalize-packages",
        enforce: "pre",
        resolveId( id ) {
          if (
            id.startsWith( "puppeteer" )
            || id.startsWith( "@puppeteer/" )
            || id.startsWith( "proxy-chain" )
            || id.startsWith( "node-fetch" )
            || id.startsWith( "node:" )
            || builtinModules.includes( id )
          ) {
            return { id, external: true }
          }
        },
      },
      visualizer( {
        filename: "public/build-stats.html",
        open: true,
        gzipSize: true,
        brotliSize: true,
      } ),
    ],
    ssr: {
      external: []
    },
  },

  runtimeConfig: {
    public: {
      siteUrl,
      siteName,
      appVersion: pkg.version,
      disableRegistration: process.env.DISABLE_REGISTRATION === "true",
      turnstile: {
        siteKey: process.env.TURNSTILE_SITE_KEY,
      },
    },
    turnstile: {
      secretKey: process.env.TURNSTILE_SECRET_KEY,
    },
    adminEmail: process.env.ADMIN_EMAIL_ADDRESS,
  },

  css: [
    "primeicons/primeicons.css",
    "~/assets/custom.scss"
  ],

  routeRules: {
    // Hashed assets can be cached forever (filenames change on rebuild)
    "/_nuxt/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
    // HTML pages must always revalidate so users never load stale entry points
    "/**": { headers: { "cache-control": "no-cache" } },
  },

  compatibilityDate: "2025-11-21",

  sourcemap: {
    client: "hidden"
  }
} )
