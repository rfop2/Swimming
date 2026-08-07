<template>
  <div class="overflow-auto">
    <h4 class="mb-1 text-center text-xl font-semibold">Northamptonshire ASA - County Championships</h4>
    <p class="mb-4 text-center font-semibold">2027 Qualifying Times</p>

    <table class="w-full border-collapse border border-gray-500 text-center text-sm">
      <thead>
        <tr>
          <th colspan="7" class="border border-gray-500 bg-teal-700 p-2 text-white">OPEN/MALE</th>
          <th colspan="7" class="border border-gray-500 bg-lime-400 p-2">FEMALE</th>
        </tr>
        <tr class="bg-gray-50">
          <th class="border border-gray-500 p-2">Event</th>
          <th v-for="age in ages" :key="`male-${age}`" class="border border-gray-500 p-2">{{ age }}</th>
          <th class="border border-gray-500 p-2">Event</th>
          <th v-for="age in ages" :key="`female-${age}`" class="border border-gray-500 p-2">{{ age }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.event">
          <td class="border border-gray-500 p-2 font-semibold">{{ row.event }}</td>
          <td v-for="( time, index ) in row.male" :key="`male-${row.event}-${index}`" class="border border-gray-500 p-2">{{ time }}</td>
          <td class="border border-gray-500 p-2 font-semibold">{{ row.event }}</td>
          <td v-for="( time, index ) in row.female" :key="`female-${row.event}-${index}`" class="border border-gray-500 p-2">{{ time }}</td>
        </tr>
      </tbody>
    </table>
    <p class="mt-3 text-center text-xs text-gray-600">All times are displayed in 25m format.</p>
  </div>
</template>

<script setup lang="ts">
  const ages = [ "10/11", "12", "13", "14", "15", "16+" ]
  const rows = [
    { event: "50 Free", male: [ "0:47.3", "0:39.3", "0:37.6", "0:35.7", "0:33.7", "0:33.0" ], female: [ "0:48.0", "0:40.4", "0:39.2", "0:37.4", "0:36.8", "0:36.4" ] },
    { event: "200 Breast", male: [ "4:37.2", "3:54.0", "3:40.0", "3:29.3", "3:24.1", "3:19.5" ], female: [ "4:33.5", "3:55.0", "3:45.0", "3:41.1", "3:38.3", "3:36.8" ] },
    { event: "400 IM", male: [ "—", "7:19.1", "6:57.6", "6:38.0", "6:27.8", "6:19.8" ], female: [ "—", "7:19.5", "7:04.3", "6:58.7", "6:52.6", "6:48.2" ] },
  ]
</script>
