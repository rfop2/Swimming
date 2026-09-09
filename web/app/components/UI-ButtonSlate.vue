<script setup lang="ts">
  withDefaults( defineProps<{
    disabled?: boolean
    to?: string
  }>(), {
    disabled: false,
    to: undefined,
  } )
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="p-2.5 rounded-sm bg-slate-900 outline outline-1 outline-offset-[-1px] outline-white/20 hover:bg-red-600 hover:outline-red-600 active:bg-red-600 active:outline-red-600 flex justify-center items-center gap-2.5 transition-colors"
    v-bind="$attrs"
  >
    <span class="text-white text-sm font-extrabold font-['Bricolage_Grotesque'] uppercase leading-5 tracking-widest">
      <slot />
    </span>
  </NuxtLink>
  <button
    v-else
    type="button"
    :disabled="disabled"
    class="p-2.5 rounded-sm bg-slate-900 outline outline-1 outline-offset-[-1px] outline-white/20 hover:bg-red-600 hover:outline-red-600 active:bg-red-600 active:outline-red-600 flex justify-center items-center gap-2.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
    v-bind="$attrs"
  >
    <span class="text-white text-sm font-extrabold font-['Bricolage_Grotesque'] uppercase leading-5 tracking-widest">
      <slot />
    </span>
  </button>
</template>
