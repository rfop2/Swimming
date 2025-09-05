<script setup lang="ts">
  import { ref, onMounted, onBeforeUnmount } from "vue"

  const props = defineProps<{
    text?: string
    position?: "top" | "bottom" | "left" | "right"
  }>()

  const show = ref( false )
  const wrapper = ref<HTMLElement | null>( null )

  const toggle = () => {
    show.value = !show.value
  }

  // Close tooltip when clicking outside
  const handleClickOutside = ( event: MouseEvent ) => {
    if ( wrapper.value && !wrapper.value.contains( event.target as Node ) ) {
      show.value = false
    }
  }

  onMounted( () => {
    document.addEventListener( "click", handleClickOutside )
  } )
  onBeforeUnmount( () => {
    document.removeEventListener( "click", handleClickOutside )
  } )
</script>

<template>
  <div
    ref="wrapper"
    class="relative inline-flex group cursor-pointer"
    @click.stop="toggle"
  >
    <!-- Trigger -->
    <slot />

    <!-- Tooltip -->
    <div
      class="absolute whitespace-nowrap z-10
             opacity-0 invisible
             group-hover:opacity-100 group-hover:visible
             transition duration-200"
      :class="[
        show ? 'opacity-100 visible' : '',
        (!position || position === 'bottom') && 'top-full left-1/2 -translate-x-1/2 mt-2',
        position === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        position === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2',
        position === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2',
      ]"
    >
      <div
        class="relative px-3 py-1.5 rounded-md shadow-md border bg-white text-gray-800 text-sm"
      >
        <!-- Default text or slot -->
        <slot name="content">
          {{ props.text }}
        </slot>

        <!-- Arrow -->
        <span
          v-if="!position || position === 'bottom'"
          class="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-gray-200 rotate-45"
        />
        <span
          v-else-if="position === 'top'"
          class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-gray-200 rotate-45"
        />
        <span
          v-else-if="position === 'right'"
          class="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white border border-gray-200 rotate-45"
        />
        <span
          v-else-if="position === 'left'"
          class="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white border border-gray-200 rotate-45"
        />
      </div>
    </div>
  </div>
</template>
