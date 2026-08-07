<template>
  <div class="overflow-auto">
    <h4 class="mb-1 text-center font-semibold">
      Swim England Suffolk County
    </h4>
    <p class="mb-4 text-center font-semibold">
      Championship Qualifying Times 2027
    </p>

    <table class="w-full border-collapse border border-gray-500 text-center text-sm">
      <thead>
        <tr class="bg-gray-100">
          <th
            colspan="7"
            class="border border-gray-500 p-2"
          >
            Female
          </th>
          <th
            rowspan="2"
            class="border border-gray-500 p-2"
          >
            Event
          </th>
          <th
            colspan="7"
            class="border border-gray-500 p-2"
          >
            Open/Male
          </th>
        </tr>
        <tr class="bg-gray-100">
          <th
            v-for="age in ages"
            :key="`female-${age}`"
            class="border border-gray-500 p-2"
          >
            {{ age }}
          </th>
          <th
            v-for="age in ages"
            :key="`male-${age}`"
            class="border border-gray-500 p-2"
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
            v-for="( time, index ) in row.female"
            :key="`female-${row.event}-${index}`"
            class="border border-gray-500 p-2"
          >
            {{ time }}
          </td>
          <td class="border border-gray-500 p-2 font-semibold">
            {{ row.event }}
          </td>
          <td
            v-for="( time, index ) in row.male"
            :key="`male-${row.event}-${index}`"
            class="border border-gray-500 p-2"
          >
            {{ time }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
  const ages = [ "10 & 11", "12", "13", "14", "15", "16", "17+" ]
  const rows = [
    {
      event: "50 Free",
      female: [ "00:41.4", "00:37.3", "00:34.2", "00:32.7", "00:31.4", "00:30.0", "00:29.4" ],
      male: [ "00:41.4", "00:36.8", "00:32.4", "00:30.9", "00:29.2", "00:28.1", "00:27.4" ],
    },
    {
      event: "200 IM",
      female: [ "03:48.9", "03:31.6", "03:16.8", "02:58.0", "02:48.2", "02:42.1", "02:37.3" ],
      male: [ "03:48.9", "03:31.6", "03:10.4", "03:01.6", "02:48.7", "02:39.6", "02:28.9" ],
    },
    {
      event: "400 IM",
      female: [ "-", "07:24.4", "06:50.0", "06:31.6", "06:07.0", "05:57.7", "05:38.7" ],
      male: [ "-", "07:24.4", "06:40.0", "06:28.9", "06:01.5", "05:41.9", "05:21.8" ],
    },
  ]
</script>
