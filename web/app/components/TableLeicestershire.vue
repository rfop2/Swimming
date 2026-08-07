<template>
  <div class="overflow-auto">
    <h4 class="mb-4 text-center text-lg font-semibold text-blue-700">
      2027 Leicestershire Age Groups and Championships Entry Times
    </h4>

    <table class="w-full border-collapse border border-gray-500 text-center text-sm">
      <thead>
        <tr class="bg-gray-100">
          <th colspan="7" class="border border-gray-500 p-2">Male Open</th>
          <th rowspan="2" class="border border-gray-500 p-2">Entry Time 25m</th>
          <th colspan="7" class="border border-gray-500 p-2">Female</th>
        </tr>
        <tr class="bg-gray-100">
          <th v-for="age in ages" :key="`male-${age}`" class="border border-gray-500 p-2">{{ age }}</th>
          <th v-for="age in ages" :key="`female-${age}`" class="border border-gray-500 p-2">{{ age }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.event">
          <td v-for="( time, index ) in row.male" :key="`male-${row.event}-${index}`" class="border border-gray-500 p-2">
            {{ time }}
          </td>
          <td class="border border-gray-500 p-2 font-semibold">{{ row.event }}</td>
          <td v-for="( time, index ) in row.female" :key="`female-${row.event}-${index}`" class="border border-gray-500 p-2">
            {{ time }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
  const ages = [ "10yr", "11yr", "12yr", "13yr", "14yr", "15yr", "16/Over" ]
  const rows = [
    {
      event: "50m Freestyle",
      male: [ "42.50", "42.50", "37.38", "35.30", "32.66", "31.28", "29.10" ],
      female: [ "41.51", "39.70", "36.60", "34.80", "34.30", "33.30", "30.70" ],
    },
    {
      event: "800m Freestyle",
      male: [ "-", "-", "12:51.10", "12:18.60", "11:27.80", "11:12.90", "10:26.10" ],
      female: [ "-", "-", "12:26.40", "11:51.20", "11:31.70", "11:18.90", "11:09.70" ],
    },
    {
      event: "200m Ind Medley",
      male: [ "3:41.96", "3:31.60", "3:19.40", "3:03.40", "2:52.00", "2:46.40", "2:43.80" ],
      female: [ "3:42.10", "3:31.10", "3:17.10", "3:05.80", "3:00.40", "2:58.60", "2:54.80" ],
    },
  ]
</script>
