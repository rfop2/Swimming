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
  hooks: {
    "pages:extend" ( pages ) {
      pages.push( {
        name: "index",
        path: "/",
        file: "~/pages/performance"
      } )
    }
  }
} )
