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
  const swimmersMap = new Map<Swimmer["id"], Swimmer>( swimmers.value.map( s => ( [ s.id, s ] ) ) )

  const swimmerOptions = computed( () => swimmers.value.map( s => ( { label: s.fullName, value: s.id } ) ) )
  const selectedSwimmer = ref( ( swimmerOptions.value.find( so => so.value === swimmer.value?.id ) ?? swimmerOptions.value[0] )?.value ?? undefined )

  watch(
    selectedSwimmer,
    async ( newSwimmer ) => {
      if ( newSwimmer ) {
        model.value = swimmersMap.get( String( newSwimmer ) )
      }
    },
    { immediate: true }
  )
</script>

<template>
  <div>
    <div class="min-w-64">
      <UI-Listbox
        v-if="swimmers && swimmers.length"
        v-model="selectedSwimmer"
        :options="swimmerOptions"
        :label="props.showLabel ? 'Swimmer' : undefined"
        placeholder="Choose Swimmer"
        v-bind="$attrs"
      />
      <span
        v-else
        class="text-red-500"
      >No Swimmers On Account</span>
      <p
        v-if="props.showUpdated"
        class="text-right pr-1 mt-2 text-xs text-gray-700"
      >
        <ClientOnly>Updated: {{ updated }}</ClientOnly>
      </p>
    </div>
  </div>
</template>
