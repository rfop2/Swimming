<template>
  <div class="overflow-auto">
    <h4 class="mb-4 text-center text-xl font-semibold">County Qualifying Times 2027</h4>
    <table class="w-full border-collapse border border-gray-500 text-center text-sm">
      <thead>
        <tr class="bg-gray-100">
          <th colspan="7" class="border border-gray-500 p-2">Male/Open</th>
          <th rowspan="2" class="border border-gray-500 p-2">Event</th>
          <th colspan="7" class="border border-gray-500 p-2">Female</th>
        </tr>
        <tr class="bg-gray-50">
          <th v-for="age in ages" :key="`male-${age}`" class="border border-gray-500 p-2">{{ age }}</th>
          <th v-for="age in ages" :key="`female-${age}`" class="border border-gray-500 p-2">{{ age }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.event">
          <td v-for="( time, index ) in row.male" :key="`male-${row.event}-${index}`" class="border border-gray-500 p-2">{{ time }}</td>
          <td class="border border-gray-500 bg-gray-100 p-2 font-semibold">{{ row.event }}</td>
          <td v-for="( time, index ) in row.female" :key="`female-${row.event}-${index}`" class="border border-gray-500 p-2">{{ time }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
  const ages = [ "10/11", "12", "13", "14", "15", "16", "17/Over" ]
  const rows = [
    { event: "50 Free", male: [ "00:40.0", "00:37.6", "00:34.5", "00:31.4", "00:29.8", "00:29.6", "00:29.2" ], female: [ "00:40.0", "00:36.2", "00:33.3", "00:31.7", "00:30.9", "00:30.8", "00:30.5" ] },
    { event: "200 Breast", male: [ "04:05.2", "03:48.2", "03:31.9", "03:19.3", "03:13.9", "03:06.7", "02:59.5" ], female: [ "04:09.1", "03:44.2", "03:28.5", "03:22.4", "03:15.9", "03:12.5", "03:09.1" ] },
    { event: "400 IM", male: [ "—", "06:55.3", "06:36.3", "06:17.9", "06:06.1", "06:01.9", "05:59.1" ], female: [ "—", "07:00.0", "06:39.7", "06:22.4", "06:18.1", "06:16.8", "06:15.9" ] },
  ]
</script>
