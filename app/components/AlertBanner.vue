<script setup lang="ts">
  import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from "@heroicons/vue/20/solid"
  import { XCircleIcon } from "@heroicons/vue/24/outline"
  import { useAlert } from "~/composables/useAlert"

  const { alerts, dismissAlert } = useAlert()

  // Tailwind classes and icons per alert type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeClasses: Record<string, any> = {
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
    warning: {
      bg: "bg-yellow-50",
      text: "text-yellow-800",
      icon: ExclamationCircleIcon,
      iconColor: "text-yellow-400",
      buttonBg: "bg-yellow-50",
      buttonText: "text-yellow-500",
      buttonHover: "hover:bg-yellow-100",
      buttonFocus: "focus-visible:ring-yellow-600 focus-visible:ring-offset-yellow-50",
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
  }
</script>

<template>
  <div class="fixed top-4 left-1/2 -translate-x-1/2 space-y-2 z-50 w-96">
    <div
      v-for="alert in alerts"
      :key="alert.id"
      :class="[
        'rounded-md p-4 flex items-start shadow',
        typeClasses[alert.type].bg
      ]"
    >
      <div class="shrink-0">
        <component
          :is="typeClasses[alert.type].icon"
          class="h-5 w-5"
          :class="typeClasses[alert.type].iconColor"
          aria-hidden="true"
        />
      </div>
      <div
        class="ml-3 flex-1 text-sm font-medium"
        :class="typeClasses[alert.type].text"
      >
        {{ alert.message }}
      </div>
      <div class="ml-auto pl-3">
        <button
          type="button"
          :class="[
            'inline-flex rounded-md p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            typeClasses[alert.type].buttonBg,
            typeClasses[alert.type].buttonText,
            typeClasses[alert.type].buttonHover,
            typeClasses[alert.type].buttonFocus
          ]"
          @click="dismissAlert(alert.id)"
        >
          <span class="sr-only">Dismiss</span>
          <XMarkIcon
            class="h-5 w-5"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  </div>
</template>
