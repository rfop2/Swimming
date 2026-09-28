<template>
  <div class="overflow-auto">
    <h4 class="mb-1 text-center font-semibold">
      Swim England East Region Championships 2026
    </h4>
    <p class="mb-4 text-center text-sm text-gray-600">
      Short Course Qualifying Times
    </p>
    <table class="w-full min-w-[58rem] border-collapse text-center text-sm">
      <thead>
        <tr class="bg-gray-100">
          <th
            rowspan="2"
            class="border border-gray-400 p-2"
          >
            Event
          </th>
          <th
            colspan="6"
            class="border border-gray-400 p-2"
          >
            Women
          </th>
          <th
            colspan="6"
            class="border border-gray-400 p-2"
          >
            Men/Open
          </th>
        </tr>
        <tr class="bg-gray-50">
          <th
            v-for="age in ages"
            :key="`female-${age}`"
            class="border border-gray-400 p-2"
          >
            {{ age }}
          </th>
          <th
            v-for="age in ages"
            :key="`male-${age}`"
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
          <td
            v-for="( time, index ) in row.male"
            :key="`male-${row.event}-${index}`"
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
  const ages = [ "11/12", "13", "14", "15", "16", "17/over" ]
  const rows = [
    { event: "50m Freestyle", female: [ "31.80", "30.30", "29.40", "29.15", "28.80", "28.60" ], male: [ "31.80", "30.00", "28.25", "26.70", "26.25", "25.25" ] },
    { event: "100m Backstroke", female: [ "1:20.50", "1:16.00", "1:13.15", "1:11.00", "1:10.50", "1:10.25" ], male: [ "1:20.50", "1:15.50", "1:11.50", "1:07.50", "1:06.00", "1:03.25" ] },
  ]
</script>
