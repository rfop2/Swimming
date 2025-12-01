<script setup lang="ts">
  import type { CellValueChangedEvent, NewValueParams, SizeColumnsToFitGridStrategy, ValueFormatterParams, ValueGetterParams, ValueSetterParams } from "ag-grid-community"
  import { ModuleRegistry, DateEditorModule, ValidationModule, ClientSideRowModelModule, ColumnAutoSizeModule, TextFilterModule, CustomEditorModule, CellStyleModule, TextEditorModule } from "ag-grid-community"
  import { AgGridVue } from "ag-grid-vue3" // Vue Data Grid Component
  import { REGIONS, COUNTIES, type ScopeType, ucFirst } from "lib"
  import { addMonths, format, getYear } from "date-fns"
  import type { FetchError } from "ofetch"
  import { ArrowUturnLeftIcon, CheckIcon } from "@heroicons/vue/24/outline"

  // ModuleRegistry.registerModules( [ AllCommunityModule ] )
  ModuleRegistry.registerModules( [
    ClientSideRowModelModule,
    ColumnAutoSizeModule,
    TextFilterModule,
    CellStyleModule,
    CustomEditorModule,
    TextEditorModule,
    DateEditorModule,
    ...( process.env.NODE_ENV !== "production" ? [ ValidationModule ] : [] ),
  ] )

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  const description = "Qualifying periods and cut-off for summer, winter and general competitions."
  useHead( {
    title: "Qualifying Dates",
    meta: [
      { name: "description", content: description }
    ]
  } )

  const user = useAuthenticatedUser()

  const { data: qualifying } = await useFetch(
    "/api/qualifying/dates",
    {
      key: "qualifying-dates",
    }
  )
  watchEffect( () => {
    console.log( "Q", qualifying.value )
  } )

  const filterYear = getYear( addMonths( new Date(), 1 ) )

  const yearOptions = Array.from( { length: 4 }, ( _, i ) => filterYear - 1 + i ).map( year => ( { value: year } ) )

  const scopeOptions = [
    {
      label: "All Scopes",
      value: "",
    },
    {
      value: "county",
      label: "County",
    },
    {
      value: "regional",
      label: "Regional",
    },
  ] as const

  const areasFromScope = ( scope: ScopeType ) => {
    if ( scope === "county" )
      return [ { label: "All Counties", value: "" } ].concat( Object.entries( COUNTIES ).map( ( [ k, v ] ) => ( { label: v, value: k } ) ).slice( 1 ) )
    if ( scope === "regional" )
      return [ { label: "All Regions", value: "" } ].concat( Object.entries( REGIONS ).map( ( [ k, v ] ) => ( { label: v, value: k } ) ).slice( 1 ) )
    return []
  }

  const typeOptions = [
    {
      value: "general",
      label: "General",
    },
    {
      value: "summer",
      label: "Summer",
    },
    {
      value: "winter",
      label: "Winter",
    },
  ] as const

  const selections = ref( {
    year: yearOptions[1]!.value,
    scope: scopeOptions[0].value,
    area: "",
    type: [] as string[],
  } )

  const areas = computed( () => areasFromScope( selections.value.scope as ScopeType ) )

  const filteredQualifying = computed( () => {
    const filtered = ( qualifying.value ?? [] ).filter( row => {
      if ( row.year !== selections.value.year )
        return false
      if ( selections.value.scope && ( row.scope !== selections.value.scope ) )
        return false
      if ( selections.value.area && ( row.area !== selections.value.area ) )
        return false
      if ( selections.value.type.length && !selections.value.type.includes( row.type ) )
        return false
      return true
    } )
    filtered.sort( ( a, b ) => {
      const diff1 = a.year - b.year
      if ( diff1 !== 0 ) return diff1
      const diff2 = a.scope.localeCompare( b.scope )
      if ( diff2 !== 0 ) return diff2
      const diff3 = a.area.localeCompare( b.area )
      if ( diff3 !== 0 ) return diff3
      const diff4 = a.type.localeCompare( b.type )
      return diff4
    } )
    return filtered
  } )

  watchEffect( () => {
    console.log( "FQ", filteredQualifying.value )
  } )

  const errString = ref<string | null>( null )

  async function reset( _e: Event ) {
    await refreshNuxtData( "qualifying-dates" )
    dirty.value = false
  }

  const saveSuccess = ref( false )
  async function save( _e: Event ) {
    try {
      await $fetch( "/api/qualifying/dates", {
        method: "PUT",
        body: JSON.stringify( ( qualifying.value ?? [] ) ),
      } )
      saveSuccess.value = true
      await refreshNuxtData( "qualifying-dates" )
      dirty.value = false
    } catch ( error ) {
      console.error( "Error", error )
      errString.value = ( error as FetchError ).message ?? null
    }
  }

  const defaultColumnAttrs = {
    type: "rightAligned",
    editable: false,
    filter: "agTextColumnFilter",
    filterParams: {
      maxNumConditions: 1,
    }
  }

  const dirty = ref( false )

  useUnsavedWarning( () => dirty.value )

  const lookupArea = ( scope: ScopeType, area: string ) => {
    if ( scope === "county" )
      return COUNTIES[area]
    if ( scope === "regional" )
      return REGIONS[area]
    return "<error>"
  }

  const columns = computed( () => [
    {
      field: "year",
      filter: false,
    },
    {
      field: "scope",
      filter: false,
      valueFormatter: ( { value }: ValueFormatterParams ) => ucFirst( value ),
      // filterValueGetter: ( params: ValueGetterParams ) => lookupScope( params.data.quaifyingScope ),
    },
    {
      field: "area",
      filter: false,
      valueFormatter: ( { value, data }: ValueFormatterParams ) => lookupArea( data.scope, value )!,
      // filterValueGetter: ( params: ValueGetterParams ) => lookupArea( params.data.scope, params.data.area ),
    },
    {
      field: "type",
      filter: false,
      valueGetter: ( params: ValueGetterParams ) => ucFirst( params.data.type ),
    },
    {
      field: "qualifyingStart",
      editable: () => !!user.value.admin,
      headerName: "Qualifying Start",
      cellEditor: "agDateStringCellEditor",
      cellEditorParams: {
        includeTime: false,
      },
      filter: false,
      valueFormatter: ( { value }: ValueFormatterParams ) => value ? format( value, "do MMM, yyyy" ) : "",
      valueSetter: ( params: ValueSetterParams ): boolean => {
        params.data.qualifyingStart = params.newValue
        return true
      },
      onCellValueChanged: ( _event: NewValueParams ) => {
        dirty.value = true
      },
    },
    {
      field: "qualifyingEnd",
      editable: () => !!user.value.admin,
      headerName: "Qualifying End",
      cellEditor: "agDateStringCellEditor",
      cellEditorParams: {
        includeTime: false,
      },
      filter: false,
      valueFormatter: ( { value }: ValueFormatterParams ) => value ? format( value, "do MMM, yyyy" ) : "",
      valueSetter: ( params: ValueSetterParams ): boolean => {
        params.data.qualifyingEnd = params.newValue
        return true
      },
      onCellValueChanged: ( _event: NewValueParams ) => {
        dirty.value = true
      },
    },
  ] )

  const autoSizeStrategy: SizeColumnsToFitGridStrategy = {
    type: "fitGridWidth",
    defaultMinWidth: 100,
  }

</script>

<template>
  <StandardPage
    title="Qualifying Cut-off Dates"
  >
    <template #description>
      <div class="sm:flex sm:justify-between">
        <div>{{ description }}</div>
        <div
          v-if="user.admin"
          class="sm:flex sm:items-end"
        >
          <div class="mt-4 sm:ml-4 sm:mt-0 sm:flex-none">
            <button
              type="button"
              class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              title="Undo any unsaved edits"
              :disabled="!dirty"
              @click="reset"
            >
              <ArrowUturnLeftIcon
                class="-ml-0.5 size-5"
                aria-hidden="true"
              />
              Reset
            </button>
          </div>
          <div class="mt-4 sm:ml-4 sm:mt-0 sm:flex-none">
            <button
              type="submit"
              class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              :disabled="!dirty"
              @click="save"
            >
              <CheckIcon
                class="-ml-0.5 size-5"
                aria-hidden="true"
              />
              Save
            </button>
          </div>
        </div>
      </div>
    </template>
    <template #controls>
      <div class="min-w-24">
        <UI-Listbox
          v-model="selections.year"
          :options="yearOptions"
          label="Year"
          placeholder="Choose Year"
        />
      </div>
      <div class="min-w-32">
        <UI-Listbox
          v-model="selections.scope"
          :options="scopeOptions"
          label="Scope"
          placeholder="Choose Scope"
          @update:model-value="()=>selections.area=''"
        />
      </div>
      <div
        v-if="selections.scope"
        class="min-w-64"
      >
        <UI-Listbox
          v-model="selections.area"
          :options="areas"
          label="Area"
          placeholder="Choose Area"
        />
      </div>
      <div class="min-w-48">
        <UI-Listbox
          v-model="selections.type"
          :options="typeOptions"
          label="Type"
          placeholder="Choose Type"
          multiple
        />
      </div>
    </template>
    <div class="overflow-x-auto">
      <ag-grid-vue
        :auto-size-strategy="autoSizeStrategy"
        :default-col-def="defaultColumnAttrs"
        :row-data="filteredQualifying"
        :column-defs="columns"
        dom-layout="autoHeight"
        class="ag-theme-quartz"
        @cell-value-changed="( event: CellValueChangedEvent ) => {
          console.log( 'Data changed', event )
        }"
      />
    </div>
    <UI-SuccessNotification
      v-model="saveSuccess"
      title="Successfully saved!"
      text="Qualifying dates have been updated."
    />
  </StandardPage>
</template>
