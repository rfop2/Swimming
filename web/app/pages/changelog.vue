<script setup lang="ts">
  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Changelog",
    meta: [
      { name: "description", content: "Version numbers and change history" }
    ]
  } )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const changelog = ref<any[]>( [] )
  const loading = ref( true )

  onMounted( async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await $fetch<any[]>( "/changelog.json", { cache: "no-store" } )
      changelog.value = data
    } catch ( err ) {
      console.error( "Failed to load changelog:", err )
    } finally {
      loading.value = false
    }
  } )
</script>

<template>
  <div class="max-w-7xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">
      Changelog
    </h1>

    <div
      v-if="loading"
      class="text-gray-500"
    >
      Loading...
    </div>

    <div v-else>
      <div
        v-for="entry in changelog"
        :key="entry.version"
        class="mb-8"
      >
        <h2 class="text-xl font-semibold mt-3 mb-2">
          Version {{ entry.title }} - {{ entry.niceDate }}
        </h2>
        <ul class="list-disc list-inside space-y-1">
          <li
            v-for="(item, idx) in entry.commits.concat( entry.merges.map( (m: { commit: any }) => m.commit ) ).sort( ( a: { date: string }, b: { date: string } ) => b.date.localeCompare( a.date ) )"
            :key="idx"
          >
            {{ item.niceDate }} - {{ item.author }} - {{ item.message }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
