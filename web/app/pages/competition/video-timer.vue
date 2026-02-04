<script setup lang="ts">
  definePageMeta( {
    layout: "secure",
    fullBleed: true,
    middleware: [ "protected" ],
  } )
</script>

<template>
  <NuxtPage />
</template>
