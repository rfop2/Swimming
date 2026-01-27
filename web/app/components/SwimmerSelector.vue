<script setup lang="ts">
  import type { Swimmer } from "lib"

  const model = defineModel<Swimmer | undefined>( { required: true } )

  const props = withDefaults( defineProps<{
    showLabel?: boolean
    showUpdated?: boolean
  }>(), {
    showLabel: true,
    showUpdated: false,
  } )

  const { swimmers } = useSwimmers()
  const { swimmer, updated } = useSwimmer()

  /**
   * Listbox options
   */
  const swimmerOptions = computed( () =>
    swimmers.value.map( s => ( {
      label: s.fullName,
      value: s.id,
    } ) )
  )

  /**
   * v-model adapter:
   * - UI-Listbox works with swimmer IDs
   * - useSwimmer works with Swimmer objects
   */
  const selectedSwimmerId = computed<Swimmer["id"] | undefined>( {
    get: () => swimmer.value?.id,
    set: ( id ) => {
      model.value = swimmers.value.find( s => s.id === id )
    },
  } )
</script>

<template>
  <div class="min-w-64">
    <UI-Listbox
      v-if="swimmers.length"
      v-model="selectedSwimmerId"
      :options="swimmerOptions"
      :label="props.showLabel ? 'Swimmer' : undefined"
      placeholder="Choose Swimmer"
      v-bind="$attrs"
    />

    <span
      v-else
      class="text-red-500"
    >
      No Swimmers On Account
    </span>

    <p
      v-if="props.showUpdated"
      class="text-right pr-1 mt-2 text-xs text-gray-700"
    >
      <ClientOnly>Updated: {{ updated }}</ClientOnly>
    </p>
  </div>
</template>
