<script setup lang="ts">
  const props = defineProps<{
    open: boolean
    sessionIds: string[]
    sessionLabel?: string
  }>()

  const emit = defineEmits<{
    ( e: "close" | "shared" ): void
  }>()

  type ShareResponse = {
    shared: { sessionId: string, email: string }[]
    alreadyShared: { sessionId: string, email: string }[]
    notFound: string[]
  }

  const emailInput = ref( "" )
  const emails = ref<string[]>( [] )
  const submitting = ref( false )
  const submitError = ref<string | null>( null )
  const result = ref<ShareResponse | null>( null )

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const addEmailFromInput = () => {
    const value = emailInput.value.trim().replace( /,+$/, "" ).toLowerCase()
    emailInput.value = ""
    if ( !value ) return

    if ( !EMAIL_RE.test( value ) ) {
      submitError.value = `"${value}" doesn't look like a valid email address.`
      return
    }

    submitError.value = null
    if ( !emails.value.includes( value ) ) emails.value = [ ...emails.value, value ]
  }

  const onInputKeydown = ( e: KeyboardEvent ) => {
    if ( e.key === "Enter" || e.key === "," ) {
      e.preventDefault()
      addEmailFromInput()
    } else if ( e.key === "Backspace" && !emailInput.value && emails.value.length > 0 ) {
      emails.value = emails.value.slice( 0, -1 )
    }
  }

  const removeEmail = ( email: string ) => {
    emails.value = emails.value.filter( e => e !== email )
  }

  const getErrorMessage = ( e: unknown ) => {
    if ( typeof e === "string" && e.trim() ) return e

    if ( e && typeof e === "object" ) {
      const obj = e as { data?: { statusMessage?: unknown, message?: unknown }, message?: unknown }
      const msg = obj.data?.statusMessage ?? obj.data?.message ?? obj.message
      if ( typeof msg === "string" && msg.trim() ) return msg
    }

    return "Failed to share session(s)."
  }

  const submit = async () => {
    if ( submitting.value ) return

    // Pick up anything left in the input box that hasn't been added yet.
    if ( emailInput.value.trim() ) addEmailFromInput()

    if ( emails.value.length === 0 ) {
      submitError.value = "Enter at least one email address."
      return
    }

    submitError.value = null
    submitting.value = true

    try {
      const response = await $fetch<ShareResponse>( "/api/competition/video-timer-session-shares", {
        method: "POST",
        body: {
          sessionIds: props.sessionIds,
          emails: emails.value,
        },
      } )

      result.value = response
      emails.value = []

      if ( response.shared.length > 0 ) emit( "shared" )
    } catch ( e: unknown ) {
      submitError.value = getErrorMessage( e )
    } finally {
      submitting.value = false
    }
  }

  const uniqueSharedEmails = computed( () => Array.from( new Set( ( result.value?.shared ?? [] ).map( s => s.email ) ) ) )
  const uniqueAlreadySharedEmails = computed( () => Array.from( new Set( ( result.value?.alreadyShared ?? [] ).map( s => s.email ) ) ) )

  const close = () => {
    emit( "close" )
  }

  watch(
    () => props.open,
    ( isOpen ) => {
      if ( !isOpen ) return
      emailInput.value = ""
      emails.value = []
      submitError.value = null
      result.value = null
    }
  )
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="close"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
        <div class="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div>
            <div class="text-lg font-semibold text-gray-900">Share session{{ sessionIds.length > 1 ? 's' : '' }}</div>
            <div class="text-xs text-gray-500 mt-1">
              {{ sessionLabel ?? `${sessionIds.length} session${sessionIds.length > 1 ? 's' : ''}` }} — viewable read-only by whoever you share with.
            </div>
          </div>

          <button type="button" class="h-10 px-4 rounded-md bg-gray-200 text-gray-900" @click="close">
            Close
          </button>
        </div>

        <div class="px-5 py-4">
          <label class="block text-xs font-medium text-gray-700 mb-1">
            Share with (email address)
          </label>

          <div class="rounded-md border border-gray-300 px-2 py-2 flex flex-wrap gap-2 items-center">
            <span
              v-for="email in emails"
              :key="email"
              class="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs font-medium"
            >
              {{ email }}
              <button type="button" class="text-indigo-400 hover:text-indigo-700" @click="removeEmail(email)">
                ×
              </button>
            </span>

            <input
              v-model="emailInput"
              type="email"
              class="flex-1 min-w-32 border-0 outline-none text-sm py-1"
              placeholder="name@example.com"
              @keydown="onInputKeydown"
              @blur="addEmailFromInput"
            >
          </div>

          <div class="mt-1 text-xs text-gray-400">
            Press Enter or comma to add each address. Only people with an existing account can be shared with.
          </div>

          <div v-if="submitError" class="mt-3 text-sm text-red-600">
            {{ submitError }}
          </div>

          <div v-if="result" class="mt-4 space-y-2">
            <div v-if="uniqueSharedEmails.length > 0" class="text-sm text-green-700">
              Shared with: {{ uniqueSharedEmails.join(', ') }}
            </div>

            <div v-if="uniqueAlreadySharedEmails.length > 0" class="text-sm text-gray-600">
              Already shared with: {{ uniqueAlreadySharedEmails.join(', ') }}
            </div>

            <div v-if="result.notFound.length > 0" class="text-sm text-red-600">
              No account found for: {{ result.notFound.join(', ') }}
            </div>
          </div>
        </div>

        <div class="border-t border-gray-200 px-5 py-4 flex justify-end gap-3">
          <button type="button" class="h-10 px-4 rounded-md bg-gray-200 text-gray-900" @click="close">
            Done
          </button>

          <button
            type="button"
            class="h-10 px-4 rounded-md bg-blue-600 text-white disabled:bg-gray-100 disabled:text-gray-400"
            :disabled="submitting"
            @click="submit"
          >
            {{ submitting ? "Sharing..." : "Share" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
