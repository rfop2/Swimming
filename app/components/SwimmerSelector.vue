<script setup lang="ts">
  import { format } from "date-fns"
  import { FetchError } from "ofetch"
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
  const { swimmer } = useSwimmer()
  const swimmersMap = new Map<Swimmer["id"], Swimmer>( swimmers.value.map( s => ( [ s.id, s ] ) ) )

  const swimmerOptions = computed( () => swimmers.value.map( s => ( { label: s.fullName, value: s.id } ) ) )
  const selectedSwimmer = ref( ( swimmerOptions.value.find( so => so.value === swimmer.value?.id ) ?? swimmerOptions.value[0] )?.value ?? undefined )

  const updated = useLastUpdate()

  watch(
    selectedSwimmer,
    async ( newSwimmer ) => {
      if ( newSwimmer ) {
        model.value = swimmersMap.get( String( newSwimmer ) )
        try {
          const lastUpdate = await $fetch( `/api/updated/${newSwimmer}` )
          updated.value = format( lastUpdate, "yyyy-MM-dd" )
        } catch ( error ) {
          updated.value = "<error>"
          if ( error instanceof FetchError ) {
            const apiError = error as FetchError
            if ( apiError.status === 404 ) {
              updated.value = "<never>"
            }
          }
        }
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
