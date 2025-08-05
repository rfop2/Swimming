<script setup lang="ts">
  import type { CalendarEventExternal } from "@schedule-x/calendar"
  import { format, parse } from "date-fns"

  const props = defineProps<{
    calendarEvent: CalendarEventExternal
  }>()
</script>

<template>
  <div tabindex="0" class="sx__event-modal sx__event-modal-default is-open">
    <div class="sx__has-icon sx__event-modal__title">
      <div class="sx__event-modal__color-icon sx__event-icon" :style="{ backgroundColor: `var(--sx-color-${calendarEvent.calendarId}-container)` }"/>
        <a
        :href="`https://www.swimmingresults.org/licensed_meets/meet.php?meet=${calendarEvent.id}&page=1&region=P&level=P&month=P&year=P`"
        target="_blank"
        rel="noopener,noreferrer"
        class=""
      >
      {{ props.calendarEvent.title }}
    </a>
    </div>
    <div class="sx__has-icon sx__event-modal__time">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sx__event-icon">
        <g id="SVGRepo_bgCarrier" stroke-width="0"/>
        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
        <g id="SVGRepo_iconCarrier">
          <path d="M12 8V12L15 15" stroke="var(--sx-internal-color-text)" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="12" r="9" stroke="var(--sx-internal-color-text)" stroke-width="2"/>
        </g>
      </svg>
      <div v-if="props.calendarEvent.start == props.calendarEvent.end">{{ format( parse( props.calendarEvent.start, "yyyy-MM-dd", new Date() ), "dd MMMM, yyyy" ) }}</div>
      <div v-else>{{ format( parse( props.calendarEvent.start, "yyyy-MM-dd", new Date() ), "dd MMMM, yyyy" ) }} &ndash; {{ format( parse( props.calendarEvent.end, "yyyy-MM-dd", new Date() ), "dd MMMM, yyyy" ) }}</div>
    </div>
    <div class="sx__has-icon sx__event-modal__location">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sx__event-icon">
        <g id="SVGRepo_bgCarrier" stroke-width="0"/>
        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
        <g id="SVGRepo_iconCarrier">
          <g clip-path="url(#clip0_429_11046)">
            <rect x="12" y="11" width="0.01" height="0.01" stroke="var(--sx-internal-color-text)" stroke-width="2" stroke-linejoin="round"/>
            <path d="M12 22L17.5 16.5C20.5376 13.4624 20.5376 8.53757 17.5 5.5C14.4624 2.46244 9.53757 2.46244 6.5 5.5C3.46244 8.53757 3.46244 13.4624 6.5 16.5L12 22Z" stroke="var(--sx-internal-color-text)" stroke-width="2" stroke-linejoin="round"/>
          </g>
          <defs>
            <clipPath id="clip0_429_11046">
              <rect width="24" height="24" fill="white"/>
            </clipPath>
          </defs>
        </g>
      </svg>
      {{ props.calendarEvent.location }} / {{ props.calendarEvent.meet.region }}
    </div>
    <div class="sx__has-icon sx__event-modal__description">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sx__event-icon">
        <g id="SVGRepo_bgCarrier" stroke-width="0"/>
        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
        <g id="SVGRepo_iconCarrier">
          <rect x="4" y="4" width="16" height="16" rx="3" stroke="var(--sx-internal-color-text)" stroke-width="2"/>
          <path d="M16 10L8 10" stroke="var(--sx-internal-color-text)" stroke-width="2" stroke-linecap="round"/>
          <path d="M16 14L8 14" stroke="var(--sx-internal-color-text)" stroke-width="2" stroke-linecap="round"/>
        </g>
      </svg>
      {{ calendarEvent.description }}
    </div>
    <div class="sx__has-icon sx__event-modal__description">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
      </svg>
      <span class="">Level {{ calendarEvent.meet.level }} / {{ calendarEvent.meet.course === "lc" ? "Long" : "Short" }} Course</span>
    </div>
  </div>
</template>
