<template>
  <div class="overflow-auto">
    <h4 class="mb-1 font-semibold">
      Devon County ASA 2027 Consideration Times
    </h4>
    <p class="mb-4 text-sm text-gray-600">
      Open / Male and Female · 25m and 50m courses
    </p>
    <table class="w-full min-w-[52rem] border-collapse text-center text-sm">
      <thead>
        <tr>
          <th class="border border-gray-300 bg-gray-100 p-2">
            Course
          </th>
          <th
            colspan="3"
            class="border border-gray-300 bg-blue-100 p-2"
          >
            Open / Male
          </th>
          <th class="border border-gray-300 bg-gray-100 p-2">
            Event
          </th>
          <th
            colspan="3"
            class="border border-gray-300 bg-blue-100 p-2"
          >
            Female
          </th>
        </tr>
        <tr>
          <th class="border border-gray-300 bg-gray-50 p-2" />
          <th
            v-for="age in [ '10', '14', '17/ov' ]"
            :key="`male-${age}`"
            class="border border-gray-300 bg-gray-50 p-2"
          >
            {{ age }}
          </th>
          <th class="border border-gray-300 bg-gray-50 p-2" />
          <th
            v-for="age in [ '10', '14', '17/ov' ]"
            :key="`female-${age}`"
            class="border border-gray-300 bg-gray-50 p-2"
          >
            {{ age }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="border border-gray-300 p-2">25m</td>
          <td class="border border-gray-300 p-2">41.20</td>
          <td class="border border-gray-300 p-2">33.00</td>
          <td class="border border-gray-300 p-2">27.00</td>
          <td class="border border-gray-300 p-2 font-medium">50m Freestyle</td>
          <td class="border border-gray-300 p-2">40.00</td>
          <td class="border border-gray-300 p-2">32.10</td>
          <td class="border border-gray-300 p-2">29.20</td>
        </tr>
        <tr>
          <td class="border border-gray-300 p-2">50m</td>
          <td class="border border-gray-300 p-2">41.70</td>
          <td class="border border-gray-300 p-2">33.60</td>
          <td class="border border-gray-300 p-2">27.80</td>
          <td class="border border-gray-300 p-2 text-gray-500">Long-course values</td>
          <td class="border border-gray-300 p-2">40.50</td>
          <td class="border border-gray-300 p-2">32.70</td>
          <td class="border border-gray-300 p-2">29.90</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
