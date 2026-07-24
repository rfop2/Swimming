<script setup lang="ts">
  withDefaults( defineProps<{
    disabled?: boolean
  }>(), {
    disabled: false,
  } )
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    class="group p-2.5 rounded-sm bg-sky-950 hover:bg-red-600 active:bg-white flex justify-center items-center gap-2.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
    v-bind="$attrs"
  >
    <span class="text-white group-active:text-red-600 text-sm font-extrabold font-['Bricolage_Grotesque'] uppercase leading-5 tracking-widest">
      <slot />
    </span>
  </button>
</template>
