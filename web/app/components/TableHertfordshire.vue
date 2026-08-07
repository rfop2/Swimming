<template>
  <div class="overflow-auto">
    <h4 class="mb-1 text-center text-xl font-semibold">Swim England Hertfordshire</h4>
    <p class="mb-1 text-center font-semibold">County Championships 2027</p>
    <p class="mb-4 text-center text-sm text-gray-600">Qualifying and Consideration Times</p>

    <table class="w-full border-collapse border border-gray-500 text-center text-sm">
      <thead>
        <tr class="bg-gray-100">
          <th rowspan="2" class="border border-gray-500 p-2">Event</th>
          <th v-for="age in ages" :key="age" colspan="2" class="border border-gray-500 p-2">{{ age }}</th>
        </tr>
        <tr class="bg-gray-50">
          <template v-for="age in ages" :key="`times-${age}`">
            <th class="border border-gray-500 p-2">QT</th>
            <th class="border border-gray-500 p-2">CT</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.event">
          <td class="border border-gray-500 p-2 font-semibold">{{ row.event }}</td>
          <td v-for="( time, index ) in row.times" :key="`${row.event}-${index}`" class="border border-gray-500 p-2">{{ time }}</td>
        </tr>
      </tbody>
    </table>
    <p class="mt-3 text-xs text-gray-600">The importer reads the QT columns. The source also contains a second table for female swimmers.</p>
  </div>
</template>

<script setup lang="ts">
  const ages = [ "10/11", "12", "13", "14", "15", "16 & over" ]
  const rows = [
    { event: "50m Free", times: [ "00:35.00", "00:37.80", "00:32.66", "00:35.00", "00:29.74", "00:32.12", "00:28.58", "00:30.87", "00:27.25", "00:29.43", "00:25.26", "00:27.28" ] },
    { event: "200m Breast", times: [ "03:41.40", "04:01.33", "03:23.73", "03:42.07", "03:08.21", "03:25.15", "03:02.05", "03:18.43", "02:56.66", "03:12.56", "02:39.12", "02:53.44" ] },
    { event: "400m IM", times: [ "—", "—", "06:01.74", "06:34.30", "05:49.96", "06:21.46", "05:29.28", "05:58.92", "05:16.17", "05:44.63", "04:54.29", "05:20.78" ] },
  ]
</script>
