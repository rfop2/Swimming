<script setup lang="ts">
  import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from "@headlessui/vue"
  import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from "@heroicons/vue/20/solid"
  import { XMarkIcon } from "@heroicons/vue/24/outline"
  import type { NotificationType, UserNotification } from "lib"

  const open = defineModel<boolean>()

  const props = defineProps<{
    notifications: UserNotification[]
    markRead: ( notification: UserNotification ) => Promise<void>
    markAllRead: () => void
    deleteAll: () => void
  }>()

  const severityClassMap: Record<NotificationType,string> = {
    info: "text-blue-500",
    success: "text-green-500",
    warn: "text-amber-500",
    error: "text-red-500",
  } as const

  const severityIconMap: Record<NotificationType,unknown> = {
    info: InformationCircleIcon,
    success: CheckCircleIcon,
    warn: ExclamationTriangleIcon,
    error: XCircleIcon,
  } as const
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <Dialog class="relative z-10" @close="open = false">
      <div class="fixed inset-0"/>
      <div class="fixed inset-0 overflow-hidden">
        <div class="absolute inset-0 overflow-hidden">
          <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
            <TransitionChild as="template" enter="transform transition ease-in-out duration-500 sm:duration-700" enter-from="translate-x-full" enter-to="translate-x-0" leave="transform transition ease-in-out duration-500 sm:duration-700" leave-from="translate-x-0" leave-to="translate-x-full">
              <DialogPanel class="pointer-events-auto w-screen max-w-md">
                <div class="relative flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto py-6">
                    <div class="px-4 sm:px-6">
                      <div class="flex items-start justify-between">
                        <DialogTitle class="text-base font-semibold text-gray-900">Notifications</DialogTitle>
                        <div class="ml-3 flex h-7 items-center">
                          <button type="button" class="relative rounded-md text-gray-400 hover:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" @click="open = false">
                            <span class="absolute -inset-2.5"/>
                            <span class="sr-only">Close</span>
                            <XMarkIcon class="size-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="relative mt-6 flex-1 px-4 sm:px-6">
                      <ul class="flex-1 divide-y overflow-y-auto">
                        <li
                          v-for="n in props.notifications"
                          :key="n.notificationId"
                          class="flex items-start gap-3 px-4 py-3 cursor-pointer"
                          :class="{
                            'bg-gray-50': !n.notificationViewed,
                          }"
                          @click="markRead( n )"
                        >
                          <!-- Severity icon -->
                          <component
                            :is="severityIconMap[n.notificationType]"
                            class="mt-0.5 h-5 w-5"
                            :class="severityClassMap[n.notificationType]"
                          />

                          <!-- Text -->
                          <p
                            class="flex-1 text-sm"
                            :class="n.notificationViewed ? 'text-gray-600' : 'font-medium text-gray-900'"
                          >
                            {{ n.notificationText }}
                          </p>

                          <!-- New dot -->
                          <span
                            v-if="!n.notificationViewed"
                            class="mt-1 h-2 w-2 rounded-full bg-blue-500"
                          />
                        </li>
                      </ul>

                      <!-- Empty state -->
                      <div
                        v-if="notifications.length === 0"
                        class="px-4 py-6 text-center text-sm text-gray-500"
                      >
                        No notifications
                      </div>
                    </div>
                  </div>
                  <div class="flex shrink-0 justify-end px-4 py-4">
                    <button
                      type="button"
                      class="form-disabled ml-4 inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      :disabled="!notifications.length"
                      @click="markAllRead(); open = false">
                      Mark all read
                    </button>
                    <button
                      type="button"
                      class="form-disabled ml-4 inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      :disabled="!notifications.length"
                      @click="deleteAll(); open = false">
                      Delete all
                    </button>
                    <button
                      type="button"
                      class="ml-4 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:ring-gray-400"
                      @click="open = false">
                      Close
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
