<template>
  <div class="overflow-auto">
    <h4 class="mb-1 text-center font-semibold">
      Cheshire County W.P. &amp; S.A. Swimming Championships 2027
    </h4>
    <p class="mb-4 text-center text-sm text-gray-600">
      Consideration Times · Short Course
    </p>
    <table class="w-full min-w-[52rem] border-collapse text-center text-sm">
      <thead>
        <tr>
          <th
            colspan="4"
            class="border border-gray-400 bg-gray-900 p-2 text-white"
          >
            Open/Male
          </th>
          <th class="border border-gray-400 bg-gray-100 p-2">
            Event
          </th>
          <th
            colspan="4"
            class="border border-gray-400 bg-gray-900 p-2 text-white"
          >
            Female
          </th>
        </tr>
        <tr class="bg-gray-50">
          <th
            v-for="age in ages"
            :key="`male-${age}`"
            class="border border-gray-400 p-2"
          >
            {{ age }}
          </th>
          <th class="border border-gray-400 p-2" />
          <th
            v-for="age in ages"
            :key="`female-${age}`"
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
          <td
            v-for="( time, index ) in row.male"
            :key="`male-${row.event}-${index}`"
            class="border border-gray-400 p-2"
          >
            {{ time }}
          </td>
          <td class="border border-gray-400 bg-gray-100 p-2 font-medium">
            {{ row.event }}
          </td>
          <td
            v-for="( time, index ) in row.female"
            :key="`female-${row.event}-${index}`"
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
  const ages = [ "10", "11", "12", "13" ]
  const rows = [
    { event: "50m Freestyle", male: [ "36.50", "36.50", "34.00", "32.00" ], female: [ "36.50", "36.50", "34.00", "32.00" ] },
    { event: "100m Backstroke", male: [ "1:33.00", "1:33.00", "1:26.00", "1:21.50" ], female: [ "1:33.00", "1:33.00", "1:26.00", "1:20.00" ] },
    { event: "400m Individual Medley", male: [ "—", "—", "6:30.00", "6:05.00" ], female: [ "—", "—", "6:30.00", "6:05.00" ] },
  ]
</script>
