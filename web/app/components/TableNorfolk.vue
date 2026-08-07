<template>
  <div class="overflow-auto">
    <h4 class="mb-1 font-semibold">
      Swim England Norfolk County Championships 2027
    </h4>
    <p class="mb-4 font-semibold">
      Qualifying Times (Long Course)
    </p>

    <section
      v-for="section in sections"
      :key="section.gender"
      class="mb-6"
    >
      <h5 class="mb-2 text-left font-semibold italic">
        {{ section.gender }} Long Course QT
      </h5>
      <table class="w-full border-collapse border border-gray-400 text-center">
        <thead>
          <tr class="bg-gray-100">
            <th
              colspan="2"
              class="border border-gray-400 p-2"
            >
              EVENT
            </th>
            <th
              v-for="age in ages"
              :key="age"
              class="border border-gray-400 p-2"
            >
              {{ age }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in section.rows"
            :key="`${section.gender}-${row.distance}-${row.stroke}`"
          >
            <td class="border border-gray-400 p-2">
              {{ row.distance }}
            </td>
            <td class="border border-gray-400 p-2">
              {{ row.stroke }}
            </td>
            <td
              v-for="time in row.times"
              :key="time"
              class="border border-gray-400 p-2"
            >
              {{ time }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
  const ages = [ "10 & 11", "12", "13", "14", "15", "16", "17/OV" ]
  const sections = [
    {
      gender: "Open/Male",
      rows: [
        { distance: "50m", stroke: "Freestyle", times: [ "41.52", "38.20", "34.97", "32.08", "29.69", "28.95", "27.10" ] },
        { distance: "100m", stroke: "Freestyle", times: [ "1:35.90", "1:27.20", "1:18.35", "1:12.00", "1:05.40", "1:03.65", "58.40" ] },
        { distance: "200m", stroke: "IM", times: [ "4:01.30", "3:37.85", "3:06.90", "2:58.00", "2:44.25", "2:39.40", "2:22.10" ] },
      ],
    },
    {
      gender: "Female",
      rows: [
        { distance: "50m", stroke: "Freestyle", times: [ "41.00", "36.50", "34.00", "32.20", "31.50", "30.75", "30.00" ] },
        { distance: "100m", stroke: "Freestyle", times: [ "1:35.00", "1:20.50", "1:15.50", "1:10.40", "1:08.95", "1:07.20", "1:04.10" ] },
        { distance: "200m", stroke: "Medley", times: [ "4:01.10", "3:16.85", "3:01.75", "2:49.60", "2:44.85", "2:42.82", "2:35.90" ] },
      ],
    },
  ]
</script>
