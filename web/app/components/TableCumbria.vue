<template>
  <div class="overflow-auto">
    <h4 class="mb-1 text-center text-xl font-semibold">Cumbria County Championships 2027 (CC27)</h4>
    <p class="mb-1 text-center font-semibold">Short Course Qualifying Times</p>
    <p class="mb-4 text-center text-sm">Age at 31/12/27</p>

    <table class="w-full border-collapse border border-gray-400 text-center text-sm">
      <thead>
        <tr class="bg-cyan-700 text-white">
          <th v-for="age in femaleAges" :key="`female-${age}`" class="border border-gray-400 p-2">{{ age }}</th>
          <th class="border border-gray-400 p-2">Event</th>
          <th v-for="age in maleAges" :key="`male-${age}`" class="border border-gray-400 p-2">{{ age }}</th>
        </tr>
        <tr class="bg-sky-300 font-semibold text-white">
          <th v-for="age in femaleAges" :key="`female-label-${age}`" class="border border-gray-400 p-2">Female</th>
          <th class="border border-gray-400 p-2" />
          <th v-for="age in maleAges" :key="`male-label-${age}`" class="border border-gray-400 p-2">Open/Male</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.event">
          <td v-for="( time, index ) in row.female" :key="`female-${row.event}-${index}`" class="border border-gray-400 p-2">{{ time }}</td>
          <td class="border border-gray-400 bg-gray-50 p-2 font-semibold">{{ row.event }}</td>
          <td v-for="( time, index ) in row.male" :key="`male-${row.event}-${index}`" class="border border-gray-400 p-2">{{ time }}</td>
        </tr>
      </tbody>
    </table>
    <p class="mt-3 text-center text-xs text-gray-600">Female ages increase left to right; Open/Male ages decrease left to right.</p>
  </div>
</template>

<script setup lang="ts">
  const femaleAges = [ "10", "11", "12", "13", "14", "15", "16/Over" ]
  const maleAges = [ "16/Over", "15", "14", "13", "12", "11", "10" ]
  const rows = [
    { event: "50m Freestyle", female: [ "50.89", "41.89", "39.39", "34.89", "31.89", "30.39", "29.89" ], male: [ "27.39", "30.39", "33.39", "36.39", "41.39", "53.89", "58.89" ] },
    { event: "200m Breaststroke", female: [ "5:12.39", "4:29.89", "4:15.89", "3:45.89", "3:34.39", "3:20.39", "3:13.39" ], male: [ "3:11.89", "3:36.89", "4:01.89", "4:20.39", "4:30.89", "4:45.89", "5:01.39" ] },
    { event: "400m IM", female: [ "-", "7:24.89", "6:55.39", "6:54.89", "6:30.89", "6:19.39", "6:11.39" ], male: [ "6:03.89", "6:51.89", "7:24.89", "8:04.89", "8:08.39", "8:48.39", "-" ] },
  ]
</script>
