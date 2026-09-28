<template>
  <div class="overflow-auto">
    <h4 class="mb-1 text-center font-semibold">
      Swim England Essex County Age Group Championships 2027
    </h4>
    <p class="mb-4 text-center text-sm text-gray-600">
      Short Course Consideration Times
    </p>
    <table class="w-full min-w-[70rem] border-collapse text-center text-sm">
      <thead>
        <tr class="bg-gray-100">
          <th
            colspan="8"
            class="border border-gray-400 p-2"
          >
            Male/Open
          </th>
          <th
            rowspan="2"
            class="border border-gray-400 p-2"
          >
            Event
          </th>
          <th
            colspan="8"
            class="border border-gray-400 p-2"
          >
            Female
          </th>
        </tr>
        <tr class="bg-gray-50">
          <th
            v-for="age in ages"
            :key="`male-${age}`"
            class="border border-gray-400 p-2"
          >
            {{ age }}
          </th>
          <th
            v-for="age in ages"
            :key="`female-${age}`"
            class="border border-gray-400 p-2"
          >
            {{ age }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.event"
        >
          <td
            v-for="( time, index ) in row.male"
            :key="`male-${row.event}-${index}`"
            class="border border-gray-400 p-2"
          >
            {{ time }}
          </td>
          <td class="border border-gray-400 bg-gray-50 p-2 font-medium">
            {{ row.event }}
          </td>
          <td
            v-for="( time, index ) in row.female"
            :key="`female-${row.event}-${index}`"
            class="border border-gray-400 p-2"
          >
            {{ time }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
  const ages = [ "10/11", "12", "13", "14", "15", "16", "17", "18+" ]
  const rows = [
    { event: "50m Freestyle", male: [ "00:36.14", "00:32.70", "00:32.55", "00:29.20", "00:29.15", "00:27.49", "00:26.25", "00:26.25" ], female: [ "00:36.66", "00:34.55", "00:33.05", "00:31.81", "00:31.20", "00:30.58", "00:30.66", "00:30.66" ] },
    { event: "200m IM", male: [ "03:20.40", "03:04.40", "02:57.50", "02:41.80", "02:37.70", "02:36.24", "02:35.71", "02:35.71" ], female: [ "03:23.60", "03:15.90", "03:00.20", "02:50.70", "02:47.85", "02:47.30", "02:47.20", "02:47.20" ] },
  ]
</script>
