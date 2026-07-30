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
    class="group p-5 rounded-sm outline outline-2 outline-offset-[-2px] outline-white bg-transparent hover:bg-white active:bg-transparent flex justify-center items-center gap-2.5 transition-colors"
    v-bind="$attrs"
  >
    <span class="text-center text-white group-hover:text-cyan-600 group-active:text-white text-[15px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-[10px] tracking-wider">
      <slot />
    </span>
  </NuxtLink>
  <button
    v-else
    type="button"
    :disabled="disabled"
    class="group p-5 rounded-sm outline outline-2 outline-offset-[-2px] outline-white bg-transparent hover:bg-white active:bg-transparent flex justify-center items-center gap-2.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
    v-bind="$attrs"
  >
    <span class="text-center text-white group-hover:text-cyan-600 group-active:text-white text-[15px] font-extrabold font-['Bricolage_Grotesque'] uppercase leading-[10px] tracking-wider">
      <slot />
    </span>
  </button>
</template>
