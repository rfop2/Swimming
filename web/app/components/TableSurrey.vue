<template>
  <div class="overflow-auto">
    <h4 class="mb-1 font-semibold">Surrey County Age Group Championships 2027</h4>
    <p class="mb-4 font-semibold">Qualifying Times</p>

    <section v-for="section in sections" :key="section.title" class="mb-6">
      <h5 class="mb-2 font-semibold">{{ section.title }}</h5>
      <table class="w-full border-collapse border border-gray-400 text-center text-sm">
        <thead>
          <tr class="bg-gray-100">
            <th class="border border-gray-400 p-2">Event</th>
            <th v-for="age in ages" :key="age" class="border border-gray-400 p-2">{{ age }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in section.rows" :key="row.event">
            <td class="border border-gray-400 p-2 font-semibold">{{ row.event }}</td>
            <td v-for="( time, index ) in row.times" :key="`${row.event}-${index}`" class="border border-gray-400 p-2">
              {{ time }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
  const ages = [ "10/11", "12", "13", "14", "15", "16", "17", "18+" ]
  const sections = [
    {
      title: "Open/Male - Long Course Pool",
      rows: [
        { event: "50m Freestyle", times: [ "33.81", "31.90", "29.90", "28.38", "26.95", "25.71", "25.33", "24.30" ] },
        { event: "800m Freestyle", times: [ "-", "10:40.86", "10:14.38", "9:59.90", "9:40.86", "9:30.00", "9:22.00", "9:17.05" ] },
      ],
    },
    {
      title: "Female - Short Course Pool",
      rows: [
        { event: "50m Freestyle", times: [ "33.80", "31.50", "29.60", "28.60", "28.00", "27.50", "27.50", "27.10" ] },
        { event: "200m Individual Medley", times: [ "3:09.90", "2:50.30", "2:39.70", "2:35.50", "2:32.10", "2:26.00", "2:24.20", "2:19.40" ] },
      ],
    },
  ]
</script>
