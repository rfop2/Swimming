// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from "./package.json"
import { createRequire } from "module"
import { visualizer } from "rollup-plugin-visualizer"

// ESM-safe way to access Node builtins
const require = createRequire( import.meta.url )
const builtinModules = require( "module" ).builtinModules


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
    build: {
      rollupOptions: {
        plugins: [ visualizer( { open: true, gzipSize: true, brotliSize: true } ) ],
        output: {
          chunkFileNames: "chunks/[name]-[hash].js", // readable names
        }
      }
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
            || builtinModules.includes( id )
          ) {
            return { id, external: true }
          }
        },
      },
    ],
    ssr: {
      external: []
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
