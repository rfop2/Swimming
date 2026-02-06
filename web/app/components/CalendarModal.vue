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
    <div v-if="meet.clubId" class="sx__has-icon sx__event-modal__club">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="sx__event-icon">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
      </svg>
      <div>{{ meet.clubName }}</div>
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
        {{ meet.region }}
      </span>
      <span v-else>
        {{ calendarEvent.location }}<br>
        {{ meet.region }}
      </span>
    </div>
    <div
      v-if="meet.poolId"
      class="sx__has-icon sx__event-modal__location"
    >
      <svg
        viewBox="4 4 16 16"
        fill="none"
        class="sx__event-icon size-4"
      ><path
        d="M24 0H0V24H24V0Z"
        fill="#ffffff"
      /><path
        d="M10.5029 17.2564C10.3838 17.2563 10.2665 17.2278 10.1605 17.1735C10.0545 17.1191 9.96298 17.0404 9.89335 16.9438C9.82373 16.8472 9.77801 16.7354 9.75997 16.6177C9.74193 16.5 9.75207 16.3797 9.78957 16.2667L12.7971 7.24404C12.8283 7.15037 12.8777 7.06376 12.9424 6.98917C13.0071 6.91458 13.0859 6.85346 13.1742 6.80932C13.2626 6.76517 13.3587 6.73885 13.4572 6.73186C13.5557 6.72488 13.6547 6.73736 13.7483 6.76861C13.842 6.79985 13.9286 6.84923 14.0032 6.91394C14.0778 6.97865 14.1389 7.05742 14.1831 7.14575C14.2272 7.23408 14.2535 7.33024 14.2605 7.42874C14.2675 7.52725 14.255 7.62616 14.2238 7.71983L11.2162 16.7425C11.1663 16.8922 11.0705 17.0223 10.9425 17.1146C10.8145 17.2068 10.6607 17.2565 10.5029 17.2564Z"
        fill="black"
      /><path
        d="M5.99161 17.2564C5.87252 17.2563 5.75518 17.2278 5.64921 17.1735C5.54325 17.1191 5.45169 17.0404 5.38206 16.9438C5.31243 16.8472 5.26672 16.7354 5.24868 16.6177C5.23064 16.5 5.24078 16.3797 5.27828 16.2667L8.28583 7.24404C8.31707 7.15037 8.36646 7.06376 8.43117 6.98917C8.49588 6.91458 8.57465 6.85346 8.66298 6.80932C8.75131 6.76517 8.84747 6.73885 8.94597 6.73186C9.04447 6.72488 9.14338 6.73736 9.23706 6.76861C9.33074 6.79985 9.41734 6.84923 9.49193 6.91394C9.56652 6.97865 9.62764 7.05742 9.67179 7.14575C9.71594 7.23408 9.74225 7.33024 9.74924 7.42874C9.75622 7.52725 9.74374 7.62616 9.7125 7.71983L6.70497 16.7425C6.65503 16.8922 6.55927 17.0223 6.43124 17.1146C6.30322 17.2068 6.14941 17.2565 5.99161 17.2564Z"
        fill="black"
      /><path
        d="M15.0143 17.2564C14.8952 17.2563 14.7778 17.2278 14.6719 17.1735C14.5659 17.1191 14.4743 17.0404 14.4047 16.9438C14.3351 16.8472 14.2894 16.7354 14.2713 16.6177C14.2533 16.5 14.2634 16.3797 14.3009 16.2667L17.3084 7.24403C17.3724 7.05596 17.5082 6.90085 17.6862 6.81258C17.8641 6.7243 18.0698 6.71003 18.2583 6.77288C18.4467 6.83572 18.6026 6.97058 18.692 7.148C18.7813 7.32543 18.7968 7.53099 18.7351 7.71982L15.7276 16.7425C15.6777 16.8921 15.5819 17.0223 15.4539 17.1146C15.3258 17.2068 15.1721 17.2564 15.0143 17.2564Z"
        fill="black"
      /></svg>
      <span>
        <a
          :href="`https://what3words.com/${ meet.poolWhatThreeWords }`"
          rel="nofollow noopener"
          target="_blank"
          title="What3Words Location"
        >{{ meet.poolWhatThreeWords }}
        </a>
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
        class="sx__event-icon size-4"
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
        class="sx__event-icon size-4"
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
.sx__event-icon {
  margin-top: 4px;
}

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
