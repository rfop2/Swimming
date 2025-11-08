<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import type { CellValueChangedEvent, NewValueParams, SizeColumnsToFitGridStrategy, ValueFormatterParams, ValueGetterParams, ValueSetterParams } from "ag-grid-community"
  import { ModuleRegistry, DateEditorModule, ValidationModule, ClientSideRowModelModule, ColumnAutoSizeModule, TextFilterModule, CustomEditorModule, CellStyleModule, TextEditorModule } from "ag-grid-community"
  import { AgGridVue } from "ag-grid-vue3" // Vue Data Grid Component
  import { REGIONS, COUNTIES, NATIONALITIES, type QualifyingPeriodRow } from "lib"
  import { addMonths, format, getYear, parseISO } from "date-fns"
  import type { FetchError } from "ofetch"
  import { ArrowUturnLeftIcon, CheckIcon, ClipboardDocumentCheckIcon, ClipboardDocumentIcon, ClipboardDocumentListIcon, TrashIcon } from "@heroicons/vue/24/outline"

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

  useHead( {
    title: "Qualifying Dates",
    meta: [
      { name: "description", content: "Qualifying periods and cut-off for summer, winter and general competitions" }
    ]
  } )

  const user = useAuthenticatedUser()

  type ApiResponse = InternalApi["/api/qualifying/dates"]["get"]

  interface ExtQualifyingPeriodRow extends QualifyingPeriodRow {
    startDate?: Date
    endDate?: Date
  }

  const { data: qualifying } = await useFetch(
    "/api/qualifying/dates",
    {
      key: "qualifying-dates",
      transform: ( data: ApiResponse ): Array<ExtQualifyingPeriodRow> => {
        const extData = data.map( row => ( {
          ...row,
          ...{
            startDate: row.qualifyingStart ? parseISO( row.qualifyingStart ) : undefined,
            endDate: row.qualifyingEnd ? parseISO( row.qualifyingEnd ) : undefined,
          }
        } ) )
        return extData
      }
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
    /* {
      value: "national",
      label: "National",
    }, */
  ]

  const areasFromScope = ( scope: string ) => {
    if ( scope === "county" )
      return [ { label: "All Counties", value: "" } ].concat( Object.entries( COUNTIES ).map( ( [ k, v ] ) => ( { label: v, value: k } ) ).slice( 1 ) )
    if ( scope === "regional" )
      return [ { label: "All Regions", value: "" } ].concat( Object.entries( REGIONS ).map( ( [ k, v ] ) => ( { label: v, value: k } ) ).slice( 1 ) )
    if ( scope === "national" )
      return Object.entries( NATIONALITIES ).map( ( [ k, v ] ) => ( { label: v, value: k } ) )
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
  ]

  const selections = ref( {
    year: yearOptions[1].value,
    scope: scopeOptions[0].value,
    area: "",
    type: [] as string[],
  } )

  const areas = computed( () => areasFromScope( selections.value.scope ) )

  const added = ref<Array<ExtQualifyingPeriodRow>>( [] )
  const deleted = ref<Array<ExtQualifyingPeriodRow>>( [] )

  watch( added, eq => {
    console.log( "GE", eq )
  }, { deep: true } )
  watch( deleted, eq => {
    console.log( "DE", eq )
  }, { deep: true } )

  const effectiveQualifying = computed(
    () =>
      ( qualifying.value ?? [] )
        .concat( added.value )
        .filter(
          row => !deleted.value.find( deletedRow => JSON.stringify( deletedRow ) === JSON.stringify( row ) )
        )
  )

  watch( effectiveQualifying, eq => {
    console.log( "EQ", eq )
  }, { deep: true } )

  const filteredQualifying = computed( () => {
    const filtered = effectiveQualifying.value.filter( row => {
      if ( row.qualifyingYear !== selections.value.year )
        return false
      if ( selections.value.scope && ( row.qualifyingScope !== selections.value.scope ) )
        return false
      if ( selections.value.area && ( row.qualifyingArea !== selections.value.area ) )
        return false
      if ( selections.value.type.length && !selections.value.type.includes( row.qualifyingType ) )
        return false
      return true
    } )
    /* filtered.sort( ( a, b ) => {
      if ( a.age < b.age ) {
        return -1
      } else if ( a.age > b.age ) {
        return 1
      }
      if ( a.course < b.course ) {
        return 1
      } else if ( a.course > b.course ) {
        return -1
      }
      if ( strokeSort[a.stroke] < strokeSort[b.stroke] ) {
        return -1
      } else if ( strokeSort[a.stroke] > strokeSort[b.stroke] ) {
        return 1
      }
      return a.distanceMetres - b.distanceMetres
    } ) */
    return filtered
  } )

  watchEffect( () => {
    console.log( "FQ", filteredQualifying.value )
  } )
  const clipboard = ref<Array<ExtQualifyingPeriodRow>>( [] )

  watch( clipboard, eq => {
    console.log( "CB", eq )
  } )

  const errString = ref<string | null>( null )

  async function clear( _e: Event ) {
    deleted.value = deleted.value.concat( filteredQualifying.value )
    dirty.value = true
  }

  async function copy( _e: Event ) {
    clipboard.value = JSON.parse( JSON.stringify( filteredQualifying.value ) )
  }

  async function paste( _e: Event ) {
    for ( const row of clipboard.value ) {
      added.value.push( { ...row, ...{
        year: selections.value.year,
        scope: selections.value.scope,
        area: selections.value.area,
        type: selections.value.type,
      } } )
    }
    dirty.value = true
  }

  async function reset( _e: Event ) {
    added.value = []
    await refreshNuxtData( "qualifying-dates" )
    deleted.value = []
    added.value = []
    clipboard.value = []
    dirty.value = false
  }

  const saveSuccess = ref( false )
  async function save( _e: Event ) {
    try {
      await $fetch( "/api/qualifying/dates", {
        method: "PUT",
        body: JSON.stringify( ( qualifying.value ?? [] ).concat( added.value.filter( data => data.time > 0 ) ) ),
      } )
      saveSuccess.value = true
      await refreshNuxtData( "qualifying-dates" )
      added.value = []
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

  const lookupScope = ( scope: string ) => ( scope.charAt( 0 ).toUpperCase() + scope.slice( 1 ) )
  const lookupArea = ( scope: string, area: string ) => {
    if ( scope === "county" )
      return COUNTIES[area]
    if ( scope === "regional" )
      return REGIONS[area]
    if ( scope === "national" )
      return NATIONALITIES[area]
    return "<error>"
  }

  const columns = computed( () => [
    {
      field: "qualifyingYear",
      filter: false,
    },
    {
      field: "qualifyingScope",
      filter: false,
      valueFormatter: ( { value }: ValueFormatterParams ) => lookupScope( value ),
      filterValueGetter: ( params: ValueGetterParams ) => lookupScope( params.data.quaifyingScope ),
    },
    {
      field: "qualifyingArea",
      filter: false,
      valueFormatter: ( { value, data }: ValueFormatterParams ) => lookupArea( data.qualifyingScope, value ),
      filterValueGetter: ( params: ValueGetterParams ) => lookupArea( params.data.qualifyingScope, params.data.qualifyingArea ),
    },
    {
      field: "qualifyingType",
      filter: false,
    },
    {
      editable: () => !!user.value.admin,
      headerName: "Qualifying Start",
      cellEditor: "agDateStringCellEditor",
      cellEditorParams: {
        includeTime: false,
      },
      filter: false,
      valueFormatter: ( { value }: ValueFormatterParams ) => value ? format( parseISO( value ), "do MMM, yyyy" ) : "",
      valueGetter: ( params: ValueGetterParams ) => {
        return params.data.qualifyingStart
      },
      valueSetter: ( params: ValueSetterParams ): boolean => {
        params.data.qualifyingStart = params.newValue
        return true
      },
      onCellValueChanged: ( _event: NewValueParams ) => {
        console.log( "Changed" )
        dirty.value = true
      },
    },
    {
      editable: () => !!user.value.admin,
      headerName: "Qualifying End",
      cellEditor: "agDateStringCellEditor",
      cellEditorParams: {
        includeTime: false,
      },
      filter: false,
      valueFormatter: ( { value }: ValueFormatterParams ) => value ? format( parseISO( value ), "do MMM, yyyy" ) : "",
      valueGetter: ( params: ValueGetterParams ) => {
        return params.data.qualifyingEnd
      },
      valueSetter: ( params: ValueSetterParams ): boolean => {
        params.data.qualifyingEnd = params.newValue
        return true
      },
      onCellValueChanged: ( _event: NewValueParams ) => {
        console.log( "Changed" )
        dirty.value = true
      },
    },
    {
      editable: () => !!user.value.admin,
      headerName: "Qualifying Start",
      cellEditor: "agDateCellEditor",
      cellEditorParams: {
        includeTime: false,
      },
      filter: false,
      valueFormatter: ( { value }: ValueFormatterParams ) => value ? format( value, "do MMM, yyyy" ) : "",
      valueGetter: ( params: ValueGetterParams ) => {
        return params.data.startDate
      },
      valueSetter: ( params: ValueSetterParams ): boolean => {
        params.data.startDate = params.newValue
        return true
      },
      onCellValueChanged: ( _event: NewValueParams ) => {
        console.log( "Changed" )
        dirty.value = true
      },
    },
    {
      editable: () => !!user.value.admin,
      headerName: "Qualifying End",
      cellEditor: "agDateCellEditor",
      cellEditorParams: {
        includeTime: false,
      },
      filter: false,
      valueFormatter: ( { value }: ValueFormatterParams ) => value ? format( value, "do MMM, yyyy" ) : "",
      valueGetter: ( params: ValueGetterParams ) => {
        return params.data.endDate
      },
      valueSetter: ( params: ValueSetterParams ): boolean => {
        params.data.endDate = params.newValue
        return true
      },
      onCellValueChanged: ( _event: NewValueParams ) => {
        console.log( "Changed" )
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
        <div>Qualifying periods for winter, summer and general qualifying areas.</div>
        <div
          v-if="user.admin"
          class="sm:flex sm:items-end"
        >
          <div
            v-if="false && filteredQualifying.length"
            class="mt-4 sm:ml-4 sm:mt-0 sm:flex-none"
          >
            <button
              type="button"
              class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              title="Copy the displayed times"
              @click="copy"
            >
              <ClipboardDocumentIcon
                v-if="!clipboard.length"
                class="-ml-0.5 size-5"
                aria-hidden="true"
              />
              <ClipboardDocumentCheckIcon
                v-else
                class="-ml-0.5 size-5"
                aria-hidden="true"
              />
              Copy
            </button>
          </div>
          <div
            v-if="false && clipboard.length && !filteredQualifying.length"
            class="mt-4 sm:ml-4 sm:mt-0 sm:flex-none"
          >
            <button
              type="button"
              class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              title="Paste the copied times"
              @click="paste"
            >
              <ClipboardDocumentListIcon
                class="-ml-0.5 size-5"
                aria-hidden="true"
              />
              Paste
            </button>
          </div>
          <div
            v-if="false && filteredQualifying.length"
            class="mt-4 sm:ml-4 sm:mt-0 sm:flex-none"
          >
            <button
              type="button"
              class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              title="Delete all displayed times"
              @click="clear"
            >
              <TrashIcon
                class="-ml-0.5 size-5"
                aria-hidden="true"
              />
              Delete
            </button>
          </div>
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
