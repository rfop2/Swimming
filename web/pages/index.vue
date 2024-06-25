<script setup lang="ts">
  import type { InternalApi } from "nitropack"

  type ApiResponse = InternalApi["/api/personal"]["get"]

  const { data: records } = await useFetch<ApiResponse>( "/api/personal" )
  console.log( records )
</script>

<template>
  <div class="container lg mx-auto">
    <h1>Welcome to the homepage</h1>
    <p>
      This is an auto-imported component
      <table>
        <thead>
          <tr>
            <th>Course</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in records"
            :key="row.stroke"
          >
            <td>{{ row.course }}</td>
            <td>{{ row.stroke }}</td>
          </tr>
        </tbody>
      </table>
    </p>
  </div>
</template>
