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
    class="group px-[54px] py-2.5 rounded-sm bg-white outline outline-1 outline-offset-[-1px] outline-slate-200 hover:outline-none active:bg-transparent active:outline active:outline-2 active:outline-offset-[-2px] active:outline-white flex justify-center items-center gap-2.5 transition-colors"
    v-bind="$attrs"
  >
    <span class="text-center text-black group-hover:text-cyan-600 group-active:text-white text-sm font-extrabold font-['Bricolage_Grotesque'] uppercase tracking-wide">
      <slot />
    </span>
  </NuxtLink>
  <button
    v-else
    type="button"
    :disabled="disabled"
    class="group px-[54px] py-2.5 rounded-sm bg-white outline outline-1 outline-offset-[-1px] outline-slate-200 hover:outline-none active:bg-transparent active:outline active:outline-2 active:outline-offset-[-2px] active:outline-white flex justify-center items-center gap-2.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
    v-bind="$attrs"
  >
    <span class="text-center text-black group-hover:text-cyan-600 group-active:text-white text-sm font-extrabold font-['Bricolage_Grotesque'] uppercase tracking-wide">
      <slot />
    </span>
  </button>
</template>
