<template>
  <div class="overflow-auto">
    <h4 class="mb-1 text-center font-semibold">
      SE London Winter Championships 2026
    </h4>
    <p class="mb-4 text-center text-sm text-gray-600">
      Long and Short Course Qualifying Times
    </p>

    <table class="w-full min-w-[52rem] border-collapse text-center text-sm">
      <thead>
        <tr class="bg-gray-100">
          <th
            rowspan="2"
            class="border border-gray-400 p-2"
          >
            Event
          </th>
          <th
            v-for="heading in headings"
            :key="heading"
            colspan="2"
            class="border border-gray-400 p-2"
          >
            {{ heading }}
          </th>
        </tr>
        <tr class="bg-gray-50">
          <template
            v-for="heading in headings"
            :key="`course-${heading}`"
          >
            <th class="border border-gray-400 p-2">LC</th>
            <th class="border border-gray-400 p-2">SC</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.event"
        >
          <td class="border border-gray-400 bg-gray-50 p-2 font-medium">
            {{ row.event }}
          </td>
          <td
            v-for="( time, index ) in row.times"
            :key="`${row.event}-${index}`"
            class="border border-gray-400 p-2"
          >
            {{ time }}
          </td>
        </tr>
      </tbody>
    </table>
    <p class="mt-3 text-xs text-gray-600">
      QT columns are imported. The 16 &amp; Under values apply to ages 10-16.
    </p>
  </div>
</template>

<script setup lang="ts">
  const headings = [ "Male 16 & Under", "Male 17 & Over", "Female 16 & Under", "Female 17 & Over" ]
  const rows = [
    { event: "50m Freestyle", times: [ "26.38", "25.60", "25.43", "24.60", "28.67", "27.90", "28.29", "27.50" ] },
    { event: "200m Individual Medley", times: [ "2:22.86", "2:20.10", "2:17.52", "2:14.60", "2:32.38", "2:29.80", "2:29.05", "2:26.40" ] },
  ]
</script>
