<script setup lang="ts">
  import { BookmarkIcon, BookmarkSlashIcon, PencilSquareIcon, TicketIcon } from "@heroicons/vue/24/outline"
  import type { CalendarEventExternal } from "@schedule-x/calendar"

  const props = defineProps<{
    calendarEvent: CalendarEventExternal
  }>()

  const { formatTemporal } = useTemporal()

  const tagged = ref( props.calendarEvent.meet.tagged )
  const meet = ref( props.calendarEvent.meet )

  watch( tagged, async ( newTagged ) => {
    if ( newTagged ) {
      await $fetch( `/api/meets/${props.calendarEvent.meet.id}`, {
        method: "PATCH",
      } )
    } else {
      await $fetch( `/api/meets/${props.calendarEvent.meet.id}`, {
        method: "DELETE",
      } )
    }
    await refreshNuxtData( "meets" )
  } )
</script>

<template>
  <div
    tabindex="0"
    class="sx__event-modal sx__event-modal-default is-open"
  >
    <div class="sx__has-icon sx__event-modal__title">
      <div
        class="sx__event-modal__color-icon sx__event-icon"
        :style="{ backgroundColor: `var(--sx-color-${calendarEvent.calendarId}-container)` }"
      />
      <a
        :href="`https://www.swimmingresults.org/licensed_meets/meet.php?meet=${calendarEvent.id}&page=1&region=P&level=P&month=P&year=P`"
        target="_blank"
        rel="noopener,noreferrer"
        class=""
      >
        {{ meet.name }}
      </a>
    </div>
    <div class="sx__has-icon sx__event-modal__time">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="sx__event-icon"
      >
        <g
          id="SVGRepo_bgCarrier"
          stroke-width="0"
        />
        <g
          id="SVGRepo_tracerCarrier"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <g id="SVGRepo_iconCarrier">
          <path
            d="M12 8V12L15 15"
            stroke="var(--sx-internal-color-text)"
            stroke-width="2"
            stroke-linecap="round"
          />
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="var(--sx-internal-color-text)"
            stroke-width="2"
          />
        </g>
      </svg>
      <div v-if="calendarEvent.start.equals( calendarEvent.end )">
        {{ formatTemporal( calendarEvent.start ) }}
      </div>
      <div v-else>
        {{ formatTemporal( calendarEvent.start ) }} &ndash; {{ formatTemporal( calendarEvent.end ) }}
      </div>
    </div>
    <div class="sx__has-icon sx__event-modal__location">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="sx__event-icon"
      >
        <g
          id="SVGRepo_bgCarrier"
          stroke-width="0"
        />
        <g
          id="SVGRepo_tracerCarrier"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <g id="SVGRepo_iconCarrier">
          <g clip-path="url(#clip0_429_11046)">
            <rect
              x="12"
              y="11"
              width="0.01"
              height="0.01"
              stroke="var(--sx-internal-color-text)"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <path
              d="M12 22L17.5 16.5C20.5376 13.4624 20.5376 8.53757 17.5 5.5C14.4624 2.46244 9.53757 2.46244 6.5 5.5C3.46244 8.53757 3.46244 13.4624 6.5 16.5L12 22Z"
              stroke="var(--sx-internal-color-text)"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </g>
          <defs>
            <clipPath id="clip0_429_11046">
              <rect
                width="24"
                height="24"
                fill="white"
              />
            </clipPath>
          </defs>
        </g>
      </svg>
      <span v-if="meet.poolId">
        {{ meet.poolName }}<br>
        {{ [ meet.poolStreet1, meet.poolStreet2, meet.poolStreet3 ].filter( s => !!s ).join( "," ) }}<br>
        {{ meet.poolTown }}, {{ meet.poolPostCode }}<br>
        {{ meet.region }}<br>
        <a
          :href="`https://what3words.com/${ meet.poolWhatThreeWords }`"
          rel="nofollow noopener"
          target="_blank"
        >///{{ meet.poolWhatThreeWords }}
        </a>
      </span>
      <span v-else>
        {{ calendarEvent.location }}<br>
        {{ meet.region }}
      </span>
    </div>
    <div class="sx__has-icon sx__event-modal__description">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="sx__event-icon"
      >
        <g
          id="SVGRepo_bgCarrier"
          stroke-width="0"
        />
        <g
          id="SVGRepo_tracerCarrier"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <g id="SVGRepo_iconCarrier">
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
            stroke="var(--sx-internal-color-text)"
            stroke-width="2"
          />
          <path
            d="M16 10L8 10"
            stroke="var(--sx-internal-color-text)"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path
            d="M16 14L8 14"
            stroke="var(--sx-internal-color-text)"
            stroke-width="2"
            stroke-linecap="round"
          />
        </g>
      </svg>
      {{ calendarEvent.description }}
    </div>
    <div class="sx__has-icon sx__event-modal__description">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="size-4"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
        />
      </svg>
      <span class="">Level {{ meet.level }} / {{ meet.course === "lc" ? "Long" : "Short" }} Course</span>
    </div>
    <div
      v-if="meet.contact || meet.email"
      class="sx__has-icon sx__event-modal__description"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="size-4"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
        />
      </svg>
      <div
        v-if="meet.contact || meet.email"
      >
        <span v-if="meet.contact">{{ meet.contact }}</span>
        <span
          v-if="meet.contact && meet.email"
          class="ml-2"
        >(<a :href="`mailto: ${meet.email}?subject=${meet.name}`">{{ meet.email }}</a>)</span>
        <span v-if="!meet.contact && meet.email"><a :href="`mailto: ${meet.email}?subject=${meet.name}`">{{ meet.email }}</a></span>
        <span v-if="meet.meetPack">
          <br>
          Meet Pack: <a
            :href="`/downloads/meets/${ meet.meetPack }`"
            rel="nofollow noopener"
            target="_blank"
          >View / Download
          </a>
        </span>
      </div>
    </div>
    <div
      class="sx__has-icon sx__event-modal__description"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="invisible size-4"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
        />
      </svg>

      <div class="flex w-full gap-2 justify-center">
        <div class="flex">
          <span
            v-if="!tagged"
          ><button
            class="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            @click.stop="tagged=1"
          >
            <BookmarkIcon
              class="-ml-0.5 size-5"
              aria-hidden="true"
            />
            Bookmark Meet
          </button></span>
          <span
            v-else
          ><button
            class="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            @click.stop="tagged=0"
          >
            <BookmarkSlashIcon
              class="-ml-0.5 size-5"
              aria-hidden="true"
            />
            Unbookmark Meet
          </button></span>
        </div>
        <div class="flex">
          <span
            v-if="!tagged"
          ><button
            class="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            @click.stop="tagged=1"
          >
            <TicketIcon
              class="-ml-0.5 size-5"
              aria-hidden="true"
            />
            Enter Swimmers
          </button></span>
          <span
            v-else
            class="mr-2"
          ><button
            class="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            @click.stop="tagged=0"
          >
            <PencilSquareIcon
              class="-ml-0.5 size-5"
              aria-hidden="true"
            />
            Edit Entries
          </button></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sx__event-modal__title {
  grid-template-columns: 30px 1fr 24px;
}
.sx__event-modal-default {
  max-height: 400px !important;
  height: auto !important;
  width: auto !important;
  overflow-y: hidden;
}

.sx__event-modal__time {
  font-size: 16px;
}
</style>
