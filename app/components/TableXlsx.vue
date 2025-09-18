<template>
    <div class="overflow-auto">
        <table class="w-full border-collapse border border-gray-400 text-center">
            <thead>
                <!-- Header: Male / Female -->
                <tr>
                    <th colspan="9" class="bg-blue-200 font-bold border border-gray-400 p-2">Open / Male 2025 Times</th>
                    <th colspan="1" class="bg-white-200"></th>
                    <th colspan="9" class="bg-pink-200 font-bold border border-gray-400 p-2">Female 2025 Times</th>
                </tr>
                <!-- Ages -->
                <tr>
                    <!-- Male ages -->
                    <th class="bg-blue-100 font-bold border border-gray-400 p-2"></th>
                    <th class="bg-blue-100 font-bold border border-gray-400 p-2">10yrs</th>
                    <th class="bg-blue-100 font-bold border border-gray-400 p-2">11yrs</th>
                    <th class="bg-blue-100 font-bold border border-gray-400 p-2">12yrs</th>
                    <th class="bg-blue-100 font-bold border border-gray-400 p-2">13yrs</th>
                    <th class="bg-blue-100 font-bold border border-gray-400 p-2">14yrs</th>
                    <th class="bg-blue-100 font-bold border border-gray-400 p-2">15yrs</th>
                    <th class="bg-blue-100 font-bold border border-gray-400 p-2">16yrs</th>
                    <th class="bg-blue-100 font-bold border border-gray-400 p-2">17/ov</th>
                    <th class="bg-gray-50 border border-gray-400 p-2"></th> <!-- spacer between male/female -->
                    <!-- Female ages -->
                    <th class="bg-pink-100 font-bold border border-gray-400 p-2">10yrs</th>
                    <th class="bg-pink-100 font-bold border border-gray-400 p-2">11yrs</th>
                    <th class="bg-pink-100 font-bold border border-gray-400 p-2">12yrs</th>
                    <th class="bg-pink-100 font-bold border border-gray-400 p-2">13yrs</th>
                    <th class="bg-pink-100 font-bold border border-gray-400 p-2">14yrs</th>
                    <th class="bg-pink-100 font-bold border border-gray-400 p-2">15yrs</th>
                    <th class="bg-pink-100 font-bold border border-gray-400 p-2">16yrs</th>
                    <th class="bg-pink-100 font-bold border border-gray-400 p-2">17/ov</th>
                    <th class="bg-pink-100 font-bold border border-gray-400 p-2"></th> <!-- spacer -->
                </tr>
            </thead>
            <tbody>
                <!-- Example row of times -->
                <tr>
                    <!-- Male times -->
                    <td class="border border-gray-400 p-2">25m</td>
                    <td class="border border-gray-400 p-2">41.50</td>
                    <td class="border border-gray-400 p-2">41.50</td>
                    <td class="border border-gray-400 p-2">37.00</td>
                    <td class="border border-gray-400 p-2">35.00</td>
                    <td class="border border-gray-400 p-2">32.50</td>
                    <td class="border border-gray-400 p-2">29.50</td>
                    <td class="border border-gray-400 p-2">28.25</td>
                    <td class="border border-gray-400 p-2">27.00</td>
                    <td class="border border-gray-400 p-2">50m Freestyle</td> <!-- spacer -->
                    <!-- Female times -->
                    <td class="border border-gray-400 p-2">43.00</td>
                    <td class="border border-gray-400 p-2">43.00</td>
                    <td class="border border-gray-400 p-2">35.60</td>
                    <td class="border border-gray-400 p-2">34.50</td>
                    <td class="border border-gray-400 p-2">32.30</td>
                    <td class="border border-gray-400 p-2">30.30</td>
                    <td class="border border-gray-400 p-2">29.40</td>
                    <td class="border border-gray-400 p-2">29.20</td>
                    <td class="border border-gray-400 p-2">25m</td> <!-- spacer -->
                </tr>
                <tr>
                    <!-- Male times -->
                    <td class="border border-gray-400 p-2">50m</td>
                    <td class="border border-gray-400 p-2">41.50</td>
                    <td class="border border-gray-400 p-2">41.50</td>
                    <td class="border border-gray-400 p-2">37.00</td>
                    <td class="border border-gray-400 p-2">35.00</td>
                    <td class="border border-gray-400 p-2">32.50</td>
                    <td class="border border-gray-400 p-2">29.50</td>
                    <td class="border border-gray-400 p-2">28.25</td>
                    <td class="border border-gray-400 p-2">27.00</td>
                    <td class="border border-gray-400 p-2">&nbsp;&nbsp;</td> <!-- spacer -->
                    <!-- Female times -->
                    <td class="border border-gray-400 p-2">43.00</td>
                    <td class="border border-gray-400 p-2">43.00</td>
                    <td class="border border-gray-400 p-2">35.60</td>
                    <td class="border border-gray-400 p-2">34.50</td>
                    <td class="border border-gray-400 p-2">32.30</td>
                    <td class="border border-gray-400 p-2">30.30</td>
                    <td class="border border-gray-400 p-2">29.40</td>
                    <td class="border border-gray-400 p-2">29.20</td>
                    <td class="border border-gray-400 p-2">50m</td> <!-- spacer -->
                </tr>
                <tr>
                    <!-- Male times -->
                    <td class="border border-gray-400 p-2">25m</td>
                    <td class="border border-gray-400 p-2">41.50</td>
                    <td class="border border-gray-400 p-2">41.50</td>
                    <td class="border border-gray-400 p-2">37.00</td>
                    <td class="border border-gray-400 p-2">35.00</td>
                    <td class="border border-gray-400 p-2">32.50</td>
                    <td class="border border-gray-400 p-2">29.50</td>
                    <td class="border border-gray-400 p-2">28.25</td>
                    <td class="border border-gray-400 p-2">27.00</td>
                    <td class="border border-gray-400 p-2">100m Freestyle</td> <!-- spacer -->
                    <!-- Female times -->
                    <td class="border border-gray-400 p-2">43.00</td>
                    <td class="border border-gray-400 p-2">43.00</td>
                    <td class="border border-gray-400 p-2">35.60</td>
                    <td class="border border-gray-400 p-2">34.50</td>
                    <td class="border border-gray-400 p-2">32.30</td>
                    <td class="border border-gray-400 p-2">30.30</td>
                    <td class="border border-gray-400 p-2">29.40</td>
                    <td class="border border-gray-400 p-2">29.20</td>
                    <td class="border border-gray-400 p-2">25m</td> <!-- spacer -->
                </tr>
                <tr>
                    <!-- Male times -->
                    <td class="border border-gray-400 p-2">50m</td>
                    <td class="border border-gray-400 p-2">41.50</td>
                    <td class="border border-gray-400 p-2">41.50</td>
                    <td class="border border-gray-400 p-2">37.00</td>
                    <td class="border border-gray-400 p-2">35.00</td>
                    <td class="border border-gray-400 p-2">32.50</td>
                    <td class="border border-gray-400 p-2">29.50</td>
                    <td class="border border-gray-400 p-2">28.25</td>
                    <td class="border border-gray-400 p-2">27.00</td>
                    <td class="border border-gray-400 p-2">&nbsp;&nbsp;</td> <!-- spacer -->
                    <!-- Female times -->
                    <td class="border border-gray-400 p-2">43.00</td>
                    <td class="border border-gray-400 p-2">43.00</td>
                    <td class="border border-gray-400 p-2">35.60</td>
                    <td class="border border-gray-400 p-2">34.50</td>
                    <td class="border border-gray-400 p-2">32.30</td>
                    <td class="border border-gray-400 p-2">30.30</td>
                    <td class="border border-gray-400 p-2">29.40</td>
                    <td class="border border-gray-400 p-2">29.20</td>
                    <td class="border border-gray-400 p-2">50m</td> <!-- spacer -->
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
</script>

<script setup lang="ts">

</script>