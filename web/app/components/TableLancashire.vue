<template>
  <div class="overflow-auto">
    <h4 class="mb-1 text-center text-xl font-semibold">Lancashire County Water Polo &amp; Swimming Association</h4>
    <p class="text-center font-semibold">Age Groups and Championships 2027</p>
    <p class="mb-4 text-center text-sm font-semibold">Consideration Times - Short Course</p>

    <table class="w-full border-collapse border border-gray-500 text-center text-sm">
      <thead>
        <tr>
          <th class="border border-gray-500 bg-blue-900 p-2 text-white">OPEN/MALE</th>
          <th v-for="age in ages" :key="age" class="border border-gray-500 bg-blue-900 p-2 text-white">{{ age }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.event">
          <td class="border border-gray-500 p-2 text-left font-semibold">{{ row.event }}</td>
          <td v-for="( time, index ) in row.times" :key="`${row.event}-${index}`" class="border border-gray-500 p-2">{{ time }}</td>
        </tr>
      </tbody>
    </table>
    <p class="mt-3 text-center text-xs text-gray-600">Female table follows the same layout. Age is at 31 December 2027.</p>
  </div>
</template>

<script setup lang="ts">
  const ages = [ "10/11", "12", "13", "14", "15", "16", "17/Over" ]
  const rows = [
    { event: "50m Freestyle", times: [ "36.59", "34.09", "31.59", "29.59", "28.59", "27.59", "26.59" ] },
    { event: "200m Breaststroke", times: [ "3.50.09", "3.34.59", "3.16.59", "3.03.59", "2.55.59", "2.53.59", "2.48.59" ] },
    { event: "400m Ind. Med", times: [ "No Event", "6.30.09", "6.10.09", "5.45.09", "5.32.09", "5.31.09", "5.26.09" ] },
  ]
</script>
