<script setup lang="ts">
  const config = useRuntimeConfig()
  useHead( {
    title: config.public.siteName,
    meta: [
      { name: "description", content: "Swimmer and swim club management and performance tracking" }
    ],
    link: [
      {
        rel: "icon",
        type: "image/png",
        href: "/images/SwimRacingIcon.png"
      },
      {
        rel: "stylesheet",
        href: "https://rsms.me/inter/inter.css",
      // crossorigin: ''
      },
    ],
    htmlAttrs: {
      class: "h-full"
    },
    bodyAttrs: {
      class: "h-full"
    },
  } )
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <CookieConsent />
</template>
