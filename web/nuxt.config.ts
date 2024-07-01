// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig( {
  devtools: { enabled: true },
  modules: [
    "@nuxtjs/tailwindcss",
    "@nuxt/eslint"
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
