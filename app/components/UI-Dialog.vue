

<script setup lang="ts">
  import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from "@headlessui/vue"

  const props = withDefaults( defineProps<{
    modelValue: boolean
    title: string
    confirmLabel?: string
    confirmEnabled?: () => boolean
    cancelLabel?: string
    action: ( arg0: Event ) => void
  }>(), {
    confirmLabel: "Ok",
    confirmEnabled: () => true,
    cancelLabel: "Cancel",
  } )

  const confirmAction = ( event: Event ) => {
    props.action( event )
    emit( "update:modelValue", false )
  }

  const emit = defineEmits<{
    ( e: "update:modelValue", value: boolean ): void
  }>()

  const close = () => {
    emit( "update:modelValue", false )
  }
</script>

<template>
  <div>
    <TransitionRoot
      :show="modelValue"
      as="template"
    >
      <Dialog
        class="relative z-10"
        @close="close()"
      >
        <TransitionChild
          as="template"
          enter="ease-out duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>

        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as="template"
              enter="ease-out duration-300"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div class="sm:flex sm:items-start">
                  <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <DialogTitle
                      as="h3"
                      class="text-base font-semibold text-gray-900"
                    >
                      {{ props.title }}
                    </DialogTitle>
                    <div class="mt-2">
                      <slot />
                    </div>
                  </div>
                </div>
                <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500  disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                    :disabled="!confirmEnabled()"
                    @click="confirmAction"
                  >
                    {{ props.confirmLabel }}
                  </button>
                  <button
                    ref="cancelButtonRef"
                    type="button"
                    class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    @click="close"
                  >
                    {{ props.cancelLabel }}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>
