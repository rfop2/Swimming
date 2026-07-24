<script setup lang="ts">
  withDefaults( defineProps<{
    to?: string
  }>(), {
    to: "/",
  } )
</script>

<template>
  <NuxtLink :to="to" class="flex items-center gap-2">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 8H1M8 1L1 8L8 15" stroke="#2E92C6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="text-cyan-600 text-[15px] font-extrabold font-['DM_Sans'] uppercase leading-[10px] tracking-wider">Back</span>
  </NuxtLink>
</template>
