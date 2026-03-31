<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { ShareIcon, XMarkIcon } from "@heroicons/vue/24/outline"
  import { FetchError } from "ofetch"
  import { format, parseISO } from "date-fns"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Performance",
    meta: [
      { name: "description", content: "Swimmer times relative to other swimmers and qualification times" }
    ]
  } )

  const { swimmer, updated } = useSwimmer()

  type RelativeApiResponse = InternalApi["/api/relative/:id"]["get"]
  type PersonalApiResponse = InternalApi["/api/personal/:id"]["get"]

  const relativeRecords = ref<RelativeApiResponse>( [] )
  const personalRecords = ref<PersonalApiResponse>( [] )

  watchEffect( async () => {
    if ( swimmer.value ) {
      try {
        relativeRecords.value = await $fetch<RelativeApiResponse>( `/api/relative/${swimmer.value.id}` )
      } catch ( error ) {
        if ( error instanceof FetchError && error.status === 404 ) {
          relativeRecords.value = []
        } else {
          throw error
        }
      }
      try {
        personalRecords.value = await $fetch<PersonalApiResponse>( `/api/personal/${swimmer.value.id}` )
      } catch ( error ) {
        if ( error instanceof FetchError && error.status === 404 ) {
          personalRecords.value = []
        } else {
          throw error
        }
      }
    }
  } )

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
    if ( import.meta.client ) {
      await navigator.clipboard.writeText( shareUrl( token ) )
      shareCopied.value = true
      setTimeout( () => {
        shareCopied.value = false
      }, 2000 )
    }
  }
</script>

<template>
  <div>
    <StandardPage
      title="Performance"
    >
      <template #description>
        Performance in events relative to the event leader if appearing in top 100 rankings in the last 12 months.
      </template>
      <template #controls>
        <SwimmerSelector
          v-model="swimmer"
          :show-label="false"
        />
        <div class="min-w-24">
          <p class="text-sm pt-1.5">
            Swimmer performance data last updated: {{ updated }}
          </p><p />
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          :disabled="!swimmer"
          @click="openSharePanel"
        >
          <ShareIcon class="-ml-0.5 size-4 text-gray-500" />
          Share
        </button>
      </template>
      <template #key>
        Key &ndash; Personal best times and how they apply to current or previous qualifying periods. Qualifying times that have been achieved are <span class="px-2 mr-1 qualified" /> highlighted.
        Swim times that are close to the qualifying time have time differences shown <span class="px-2 mr-1 qualify-prox-5" /> if within 5%, and <span class="px-2 mr-1 qualify-prox-10" /> if within 10%.
        Event ranking is in the <span class="px-2 mr-1 rank-10" /> top 10, <span class="px-2 mr-1 rank-20" /> top 20, <span class="px-2 mr-1 rank-50" /> top 50. Swim times in <span class="time-pb">purple</span> are personal bests. Qualification times in <span class="italic">italics</span> mean qualification is closed.
      </template>

      <div>
        <div
          v-if="swimmer"
          class="inline-block min-w-full py-2 align-middle"
        >
          <PerformanceTable
            :swimmer="swimmer"
            :relative-records="relativeRecords"
            :personal-records="personalRecords"
          />
        </div>
      </div>
    </StandardPage>

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
            Share links give public read-only access to this swimmer's performance page. Links expire after 30 days and can be revoked at any time.
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
  </div>
</template>

<style scoped>
.qualified {
  background-color: #22c55e30;
}

.qualify-prox-5 {
  background-color: #f9741642;
}

.qualify-prox-10 {
  background-color: #ef444459;
}

.rank-10 {
  background-color: #0058fc63;
}

.rank-20 {
  background-color: #3cadfd80;
}

.rank-50 {
  background-color: #9eccf880;
}

.time-pb {
  color: #b80381;
}
</style>
