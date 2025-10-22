<script setup lang="ts">
  useHead( {
    title: "Swim.Racing",
    meta: [
      { name: "description", content: "Swimmer and swim club management and performance tracking" }
    ],
    link: [
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
</template>
