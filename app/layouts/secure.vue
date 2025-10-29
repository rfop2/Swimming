<script setup lang="ts">
  useHead( {
    title: "Swim.Racing",
    meta: [
      { name: "description", content: "Swimming stats." }
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

  useTasksCheck()
</script>

<template>
  <div class="min-h-full">
    <NavBar />
    <div class="py-4">
      <main>
        <div class="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
