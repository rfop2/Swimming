<template>
  <div class="overflow-auto">
    <h4 class="mb-1 text-center text-xl font-semibold">South West Winter Regional Consideration Times 2026</h4>
    <p class="mb-4 text-center text-sm text-gray-600">Short Course - Junior and Senior</p>

    <table class="w-full border-collapse border border-gray-500 text-center text-sm">
      <thead>
        <tr class="bg-gray-100">
          <th rowspan="2" class="border border-gray-500 p-2">Event</th>
          <th v-for="age in ages" :key="age" colspan="2" class="border border-gray-500 p-2">{{ age }}</th>
        </tr>
        <tr class="bg-gray-50">
          <template v-for="age in ages" :key="`gender-${age}`">
            <th class="border border-gray-500 p-2 text-blue-700">Open/Male</th>
            <th class="border border-gray-500 p-2 text-red-600">Female</th>
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
    <p class="mt-3 text-xs text-gray-600">The 13/14 values are imported for both ages 13 and 14. The source table is embedded in the PDF as an image.</p>
  </div>
</template>

<script setup lang="ts">
  const ages = [ "13/14", "15", "16", "17+" ]
  const rows = [
    { event: "50m Freestyle", times: [ "27.30", "29.00", "27.00", "28.70", "25.60", "28.00", "25.00", "27.50" ] },
    { event: "200m Breaststroke", times: [ "2:51.50", "2:56.00", "2:51.00", "2:56.00", "2:50.00", "2:55.00", "2:39.00", "2:52.00" ] },
    { event: "400m Individual Medley", times: [ "5:20.00", "5:32.00", "5:15.00", "5:30.00", "5:05.00", "5:29.00", "5:00.00", "5:25.00" ] },
  ]
</script>
