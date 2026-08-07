<template>
  <div class="overflow-auto">
    <h4 class="mb-1 text-center text-xl font-semibold">Wiltshire Swimming Championships 2027</h4>
    <p class="mb-1 text-center font-semibold">Age Group Consideration Times</p>
    <p class="mb-4 text-center text-sm text-gray-600">Short course (25m) times</p>

    <table class="w-full border-collapse border border-gray-500 text-center text-sm">
      <thead>
        <tr class="bg-green-50">
          <th class="border border-gray-500 p-2">Gender</th>
          <th class="border border-gray-500 p-2">Age</th>
          <th v-for="event in events" :key="event" class="border border-gray-500 p-2">{{ event }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="`${row.gender}-${row.age}`">
          <td class="border border-gray-500 p-2 font-semibold">{{ row.gender }}</td>
          <td class="border border-gray-500 p-2">{{ row.age }}</td>
          <td v-for="time in row.times" :key="time" class="border border-gray-500 p-2">{{ time }}</td>
        </tr>
      </tbody>
    </table>
    <p class="mt-3 text-xs text-gray-600">The complete spreadsheet also contains the remaining freestyle, backstroke, breaststroke, butterfly and medley events.</p>
  </div>
</template>

<script setup lang="ts">
  const events = [ "50m Free", "100m Free", "200m Back", "200m IM" ]
  const rows = [
    { gender: "Female", age: "10/11", times: [ "43.50", "1.45.00", "3.50.00", "4.00.00" ] },
    { gender: "Female", age: "15", times: [ "32.00", "1.11.00", "2.50.00", "2.55.00" ] },
    { gender: "Open/Male", age: "17+", times: [ "27.20", "1.00.00", "2.40.00", "2.45.00" ] },
  ]
</script>
