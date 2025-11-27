<script setup lang="ts">
  import {
    XMarkIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationCircleIcon,
    InformationCircleIcon,
  } from "@heroicons/vue/20/solid"

  const { alerts, dismissAlert } = useAlert()

  const typeClasses = {
    success: {
      bg: "bg-green-50",
      text: "text-green-800",
      icon: CheckCircleIcon,
      iconColor: "text-green-400",
      buttonBg: "bg-green-50",
      buttonText: "text-green-500",
      buttonHover: "hover:bg-green-100",
      buttonFocus: "focus-visible:ring-green-600 focus-visible:ring-offset-green-50",
    },
    error: {
      bg: "bg-red-50",
      text: "text-red-800",
      icon: XCircleIcon,
      iconColor: "text-red-400",
      buttonBg: "bg-red-50",
      buttonText: "text-red-500",
      buttonHover: "hover:bg-red-100",
      buttonFocus: "focus-visible:ring-red-600 focus-visible:ring-offset-red-50",
    },
    info: {
      bg: "bg-blue-50",
      text: "text-blue-800",
      icon: InformationCircleIcon,
      iconColor: "text-blue-400",
      buttonBg: "bg-blue-50",
      buttonText: "text-blue-500",
      buttonHover: "hover:bg-blue-100",
      buttonFocus: "focus-visible:ring-blue-600 focus-visible:ring-offset-blue-50",
    },
    warning: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      icon: ExclamationCircleIcon,
      iconColor: "text-amber-400",
      buttonBg: "bg-amber-50",
      buttonText: "text-amber-500",
      buttonHover: "hover:bg-amber-100",
      buttonFocus: "focus-visible:ring-amber-600 focus-visible:ring-offset-amber-50",
    },
  }
</script>

<template>
  <TransitionGroup
    name="fade-slide"
    tag="div"
    class="space-y-1"
  >
    <div
      v-for="alert in alerts"
      :key="alert.id"
      :class="['rounded-md p-4', typeClasses[alert.type].bg]"
    >
      <div class="flex">
        <!-- Icon -->
        <div class="shrink-0">
          <component
            :is="typeClasses[alert.type].icon"
            class="size-5"
            :class="typeClasses[alert.type].iconColor"
            aria-hidden="true"
          />
        </div>

        <!-- Message -->
        <div class="ml-3">
          <p
            class="text-sm font-medium"
            :class="typeClasses[alert.type].text"
          >
            {{ alert.message }}
          </p>
        </div>

        <!-- Dismiss button -->
        <div class="ml-auto pl-3">
          <div class="-mx-1.5 -my-1.5">
            <button
              type="button"
              class="inline-flex rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              :class="[
                typeClasses[alert.type].buttonBg,
                typeClasses[alert.type].buttonText,
                typeClasses[alert.type].buttonHover,
                typeClasses[alert.type].buttonFocus
              ]"
              @click="dismissAlert(alert.id)"
            >
              <span class="sr-only">Dismiss</span>
              <XMarkIcon
                class="size-5"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
