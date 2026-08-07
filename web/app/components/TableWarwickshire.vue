<template>
  <div class="overflow-auto">
    <h4 class="mb-1 text-center text-xl font-semibold">Warwickshire County Championships 2027</h4>
    <p class="mb-1 text-center font-semibold">Qualification Times</p>
    <p class="mb-4 text-center text-sm text-gray-600">Short Course Times or converted Long Course</p>

    <table class="w-full border-collapse border border-gray-500 text-center text-sm">
      <thead>
        <tr class="bg-green-50">
          <th colspan="8" class="border border-gray-500 p-2">Female</th>
          <th rowspan="2" class="border border-gray-500 p-2">Event</th>
          <th colspan="8" class="border border-gray-500 p-2">Open/Male</th>
        </tr>
        <tr class="bg-gray-50">
          <th v-for="age in ages" :key="`female-${age}`" class="border border-gray-500 p-2">{{ age }}</th>
          <th v-for="age in ages" :key="`male-${age}`" class="border border-gray-500 p-2">{{ age }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.event">
          <td v-for="( time, index ) in row.female" :key="`female-${row.event}-${index}`" class="border border-gray-500 p-2">{{ time }}</td>
          <td class="border border-gray-500 p-2 font-semibold text-red-600">{{ row.event }}</td>
          <td v-for="( time, index ) in row.male" :key="`male-${row.event}-${index}`" class="border border-gray-500 p-2">{{ time }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
  const ages = [ "10/11", "12", "13", "14", "15", "16", "17", "18+" ]
  const rows = [
    {
      event: "50m Freestyle",
      female: [ "40.0", "36.0", "33.1", "31.8", "30.9", "30.7", "30.3", "30.1" ],
      male: [ "40.3", "36.7", "33.5", "31.6", "30.1", "28.7", "28.3", "28.0" ],
    },
    {
      event: "800m Freestyle",
      female: [ "-", "11:21.2", "10:48.9", "10:27.2", "10:19.3", "10:03.1", "10:00.9", "9:58.4" ],
      male: [ "-", "11:44.7", "11:26.0", "10:48.1", "10:25.4", "9:59.7", "9:51.7", "9:47.1" ],
    },
    {
      event: "200m Ind Medley",
      female: [ "3:32.1", "3:14.2", "3:01.0", "2:51.5", "2:46.9", "2:44.9", "2:40.1", "2:39.1" ],
      male: [ "3:34.7", "3:17.7", "3:01.8", "2:50.7", "2:45.6", "2:34.2", "2:29.4", "2:28.1" ],
    },
  ]
</script>
