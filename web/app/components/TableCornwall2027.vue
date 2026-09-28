<template>
  <div class="space-y-5 overflow-auto">
    <h4 class="text-center text-xl font-semibold">Cornwall County Champs 2027</h4>
    <p class="text-center font-semibold">Qualifying and Consideration Times</p>
    <table class="w-full border-collapse border border-gray-500 text-center text-sm">
      <thead>
        <tr class="bg-gray-100">
          <th class="border border-gray-500 p-2">Male/Open event</th>
          <th v-for="age in ages" :key="age" class="border border-gray-500 p-2">{{ age }}</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="row in rows" :key="row.event">
          <tr>
            <td class="border border-gray-500 p-2 font-semibold">{{ row.event }}</td>
            <td v-for="( time, index ) in row.qt" :key="`qt-${row.event}-${index}`" class="border border-gray-500 p-2">{{ time }}</td>
          </tr>
          <tr class="bg-gray-50 text-gray-600">
            <td class="border border-gray-500 p-2">Consideration</td>
            <td v-for="( time, index ) in row.ct" :key="`ct-${row.event}-${index}`" class="border border-gray-500 p-2">{{ time }}</td>
          </tr>
        </template>
      </tbody>
    </table>
    <p class="text-xs text-gray-600">The importer reads the QT event rows. The source contains a second table for female swimmers.</p>
  </div>
</template>

<script setup lang="ts">
  const ages = [ "10&11", "12", "13", "14", "15", "16", "17& Over" ]
  const rows = [
    { event: "50m Freestyle", qt: [ "40.08", "38.2", "35.77", "33.72", "29.45", "28.4", "26.58" ], ct: [ "43.33", "43.07", "39.94", "36.4", "33.15", "31.5", "30.98" ] },
    { event: "200m Breaststroke", qt: [ "04:06.5", "03:45.2", "03:38.6", "03:26.3", "03:13.1", "03:05.0", "03:01.5" ], ct: [ "04:16.0", "04:06.0", "03:59.4", "03:59.4", "03:18.1", "03:10.4", "03:10.4" ] },
    { event: "400m IM", qt: [ "—", "06:23.0", "06:23.0", "06:02.0", "05:37.6", "05:24.4", "05:24.4" ], ct: [ "—", "06:43.1", "06:43.1", "06:22.0", "05:57.8", "05:44.4", "05:44.4" ] },
  ]
</script>
