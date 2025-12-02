<script setup lang="ts">
  import { ref, onMounted, onBeforeUnmount, nextTick } from "vue"

  const props = defineProps<{
    text?: string
    position?: "top" | "bottom" | "left" | "right"
  }>()

  const show = ref( false )
  const wrapper = ref<HTMLElement | null>( null )
  const tooltip = ref<HTMLElement | null>( null )
  const coords = ref<{ top: string, left: string, transform: string }>( {
    top: "0px",
    left: "0px",
    transform: "",
  } )

  function updatePosition() {
    if ( !wrapper.value || !tooltip.value ) return

    const rect = wrapper.value.getBoundingClientRect()
    const gap = 8

    switch ( props.position ) {
      case "top":
        coords.value = {
          top: `${rect.top - gap}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: "translate(-50%, -100%)",
        }
        break
      case "right":
        coords.value = {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + gap}px`,
          transform: "translateY(-50%)",
        }
        break
      case "left":
        coords.value = {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.left - gap}px`,
          transform: "translate(-100%, -50%)",
        }
        break
      default: // bottom
        coords.value = {
          top: `${rect.bottom + gap}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: "translateX(-50%)",
        }
    }
  }

  function showTooltip() {
    show.value = true
    nextTick( updatePosition )
  }

  function hideTooltip() {
    show.value = false
  }

  const handleClickOutside = ( event: MouseEvent ) => {
    if ( wrapper.value && !wrapper.value.contains( event.target as Node ) ) {
      show.value = false
    }
  }

  onMounted( () => {
    document.addEventListener( "click", handleClickOutside )
    window.addEventListener( "scroll", updatePosition, true )
    window.addEventListener( "resize", updatePosition )
  } )

  onBeforeUnmount( () => {
    document.removeEventListener( "click", handleClickOutside )
    window.removeEventListener( "scroll", updatePosition, true )
    window.removeEventListener( "resize", updatePosition )
  } )
</script>

<template>
  <div
    ref="wrapper"
    class="inline-flex cursor-pointer"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    @click.stop="show = !show"
  >
    <!-- Trigger -->
    <slot />

    <!-- Tooltip (teleported to body) -->
    <teleport to="body">
      <div
        v-if="show"
        ref="tooltip"
        class="fixed z-[9999] whitespace-nowrap transition duration-150"
        :style="coords"
      >
        <div
          class="relative px-3 py-1.5 rounded-md shadow-md border bg-white text-gray-800 text-sm"
        >
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
    </teleport>
  </div>
</template>
