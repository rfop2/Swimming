<script setup lang="ts">
const { data: records } = await useFetch('/api/personal')
console.log( records )
</script>

<template>
    <div>
      <h1>Welcome to the homepage</h1>
      <AppAlert>
        This is an auto-imported component
      </AppAlert>
    </div>
</template>
