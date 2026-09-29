<script setup lang="ts">
  import { ShareIcon, XMarkIcon } from "@heroicons/vue/24/outline"
  import { format, parseISO } from "date-fns"
  import type { Swimmer } from "lib"

  const props = defineProps<{
    swimmer?: Swimmer | null
  }>()

  const swimmer = toRef( props, "swimmer" )

  // ── Share link management ──────────────────────────────────────────────────

  interface ShareLink {
    token: string
    swimmerId: string
    createdAt: string
    expiresAt: string
    revokedAt: string | null
  }

  const shareOpen = ref( false )
  const shareLinks = ref<ShareLink[]>( [] )
  const shareLoading = ref( false )
  const shareCopied = ref( false )

  const loadShareLinks = async () => {
    if ( !swimmer.value ) return
    shareLoading.value = true
    try {
      shareLinks.value = await $fetch<ShareLink[]>( `/api/share?swimmerId=${swimmer.value.id}` )
    } finally {
      shareLoading.value = false
    }
  }

  const openSharePanel = async () => {
    shareOpen.value = true
    await loadShareLinks()
  }

  watch( swimmer, () => {
    if ( shareOpen.value ) loadShareLinks()
  } )

  const createShareLink = async () => {
    if ( !swimmer.value ) return
    shareLoading.value = true
    try {
      const result = await $fetch<ShareLink>( "/api/share", {
        method: "POST",
        body: { swimmerId: swimmer.value.id },
      } )
      shareLinks.value.unshift( result )
      await copyShareUrl( result.token )
    } finally {
      shareLoading.value = false
    }
  }

  const revokeShareLink = async ( token: string ) => {
    shareLoading.value = true
    try {
      await $fetch( `/api/share/${token}`, { method: "DELETE" } )
      shareLinks.value = shareLinks.value.filter( l => l.token !== token )
    } finally {
      shareLoading.value = false
    }
  }

  const shareUrl = ( token: string ) => {
    const origin = import.meta.client ? window.location.origin : ""
    return `${origin}/share/${token}`
  }

  const copyShareUrl = async ( token: string ) => {
    if ( !import.meta.client ) return
    const url = shareUrl( token )
    if ( navigator.clipboard ) {
      await navigator.clipboard.writeText( url )
    } else {
      const el = document.createElement( "textarea" )
      el.value = url
      el.style.position = "fixed"
      el.style.opacity = "0"
      document.body.appendChild( el )
      el.select()
      document.execCommand( "copy" )
      document.body.removeChild( el )
    }
    shareCopied.value = true
    setTimeout( () => {
      shareCopied.value = false
    }, 2000 )
  }
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
    :disabled="!swimmer"
    @click="openSharePanel"
  >
    <ShareIcon class="-ml-0.5 size-4 text-gray-500" />
    Share
  </button>

  <!-- Share panel -->
  <div
    v-if="shareOpen"
    class="fixed inset-0 z-50 flex justify-end"
  >
    <div
      class="absolute inset-0 bg-black/30"
      @click="shareOpen = false"
    />
    <div class="relative z-10 flex w-full max-w-md flex-col bg-white shadow-xl">
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-4">
        <h2 class="text-base font-semibold text-gray-900">
          Share – {{ swimmer?.firstName }} {{ swimmer?.lastName }}
        </h2>
        <button
          type="button"
          class="rounded-md text-gray-400 hover:text-gray-500"
          @click="shareOpen = false"
        >
          <XMarkIcon class="size-5" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <p class="text-sm text-gray-600">
          Share links give public read-only access to this swimmer's personal bests and qualifications. Links expire after 30 days and can be revoked at any time.
        </p>

        <button
          type="button"
          class="w-full inline-flex justify-center items-center gap-x-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          :disabled="shareLoading"
          @click="createShareLink"
        >
          <ShareIcon class="size-4" />
          {{ shareCopied ? 'Copied!' : 'Generate new link & copy' }}
        </button>

        <div
          v-if="shareLinks.length"
          class="space-y-2"
        >
          <h3 class="text-sm font-medium text-gray-900">
            Active links
          </h3>
          <ul class="divide-y divide-gray-100 rounded-md border border-gray-200">
            <li
              v-for="link in shareLinks"
              :key="link.token"
              class="flex items-center justify-between gap-x-2 px-3 py-2 text-xs text-gray-600"
            >
              <div class="min-w-0">
                <p class="truncate font-mono text-gray-900">
                  {{ shareUrl( link.token ) }}
                </p>
                <p class="text-gray-400">
                  Expires {{ format( parseISO( link.expiresAt ), "yyyy-MM-dd" ) }}
                </p>
              </div>
              <div class="flex shrink-0 gap-x-2">
                <button
                  type="button"
                  class="text-indigo-600 hover:text-indigo-500"
                  @click="copyShareUrl( link.token )"
                >
                  Copy
                </button>
                <button
                  type="button"
                  class="text-red-600 hover:text-red-500"
                  :disabled="shareLoading"
                  @click="revokeShareLink( link.token )"
                >
                  Revoke
                </button>
              </div>
            </li>
          </ul>
        </div>

        <p
          v-else-if="!shareLoading"
          class="text-sm text-gray-400"
        >
          No active links.
        </p>
      </div>
    </div>
  </div>
</template>
