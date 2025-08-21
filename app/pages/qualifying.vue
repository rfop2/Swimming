<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import type { CellValueChangedEvent, GetQuickFilterTextParams, IRowNode, NewValueParams, ValueFormatterParams, ValueGetterParams, ValueSetterParams } from "ag-grid-community"
  import "ag-grid-community/styles/ag-grid.css" // Mandatory CSS required by the Data Grid
  import "ag-grid-community/styles/ag-theme-quartz.css" // Optional Theme applied to the Data Grid
  import { AgGridVue } from "ag-grid-vue3" // Vue Data Grid Component
  import { type Swimmer, secondsToTime, strokeSort, timeToSeconds, type QualifyingRow, getCompetitionAge, REGIONS, COUNTIES } from "lib"
  import { addMonths, getYear, parseISO } from "date-fns"
  import type { FetchError } from "ofetch"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  const swimmer = useState<Swimmer>( "swimmer" )

  type ApiResponse = InternalApi["/api/qualifying"]["get"]

  interface ExtQualifyingRow extends QualifyingRow {
    distanceMetres: number
  }

  const { data: qualifying } = await useFetch(
    "/api/qualifying",
    {
      transform( data: ApiResponse ): Array<ExtQualifyingRow> {
        const extData = data.map( row => {
          return {
            ...row,
            ...{
              time: row.time || timeToSeconds( row.timeString ),
              timeString: row.timeString.replace( /^0+:?/, "" ),
              distanceMetres: Number( row.distance.replace( /m$/, "" ) )
            }
          }
        } )
        extData.sort( ( a, b ) => {
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
        } )
        return extData
      },
    }
  )

  const filterYear = getYear( addMonths( new Date(), 1 ) )

  const years = Array.from( { length: 6 }, ( _, i ) => filterYear - 3 + i ).map( year => ( { value: year } ) )

  const scopes = [
    {
      value: "county",
      label: "County",
    },
    {
      value: "regional",
      label: "Regional",
    },
    {
      value: "national",
      label: "National",
    },
  ]

  const genders = [
    {
      value: "male",
      label: "Male",
    },
    {
      value: "female",
      label: "Female",
    },
  ]

  const ages = ref<Array<{value: string}>>( [] )

  const selections = ref( {
    year: years[0],
    scope: scopes[0],
    gender: genders[0],
    age: ages.value[0],
  } )

  const filterArea = computed( () => areaFromScope( selections.value.scope.value ) )

  const filteredQualifying = computed( () => ( qualifying.value ?? [] ).filter( row => {
    if ( row.year !== selections.value.year.value )
      return false
    if ( row.scope !== selections.value.scope.value )
      return false
    if ( row.area !== filterArea.value )
      return false
    if ( row.gender !== selections.value.gender.value )
      return false
    if ( row.age !== selections.value.age.value )
      return false
    return true
  } ) )

  const errString = ref<string | null>( null )

  async function reset( _e: Event ) {
    await refreshNuxtData()
    dirty.value = false
  }

  async function save( _e: Event ) {
    try {
      await $fetch( "/api/qualifying", {
        method: "PUT",
        body: JSON.stringify( qualifying.value ),
      } )
      await refreshNuxtData()
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

  const lookupScope = ( scope: string ) => ( scope.charAt( 0 ).toUpperCase() + scope.slice( 1 ) )
  const lookupArea = ( scope: string, area: string ) => {
    if ( scope === "county" )
      return COUNTIES[area]
    if ( scope === "regional" )
      return REGIONS[area]
    if ( scope === "national" )
      return ""
    return "<error>"
  }

  const columns = ref( [
    {
      field: "year",
    },
    {
      field: "scope",
      valueFormatter: ( { value }: ValueFormatterParams ) => lookupScope( value ),
      filterValueGetter: ( params: ValueGetterParams ) => lookupScope( params.data.scope ),
    },
    {
      field: "area",
      valueFormatter: ( { value, data }: ValueFormatterParams ) => lookupArea( data.scope, value ),
      filterValueGetter: ( params: ValueGetterParams ) => lookupArea( params.data.scope, params.data.area ),
    },
    {
      field: "distance",
      comparator: ( valueA: string, valueB: string, rowA: IRowNode, rowB: IRowNode ) => {
        return rowA.data.distanceMetres - rowB.data.distanceMetres
      }
    },
    {
      field: "stroke",
      // valueFormatter: ( { value }: ValueFormatterParams ) => value ? value.charAt( 0 ).toUpperCase() + value.slice( 1 ) : "",
      valueFormatter: ( { value }: ValueFormatterParams ) => value ? value.split( "_" ).map( ( word: string ) => word.charAt( 0 ).toUpperCase() + word.slice( 1 ) ).join( " " ) : ""

    },
    {
      field: "course",
      valueFormatter: ( { value }: ValueFormatterParams ) => value === "lc" ? "Long" : "Short",
      filterValueGetter: ( params: ValueGetterParams ) => {
        return params.data.course === "lc" ? "Long" : "Short"
      },
    },
    {
      field: "gender",
      valueFormatter: ( { value }: ValueFormatterParams ) => value ? value.charAt( 0 ).toUpperCase() + value.slice( 1 ) : "",
    },
    {
      field: "age",
    },
    {
      editable: true,
      headerName: "Time",
      cellEditor: "agNumberCellEditor",
      cellEditorParams: { min: 30, max: 1800 },
      type: [ "numericColumn" ],
      filter: false,
      valueGetter: ( params: ValueGetterParams ) => {
        return params.data.time
      },
      valueSetter: ( params: ValueSetterParams ): boolean => {
        params.data.time = params.newValue
        params.data.timeString = secondsToTime( params.newValue )
        return true
      },
      getQuickFilterText: ( _params: GetQuickFilterTextParams ): string => {
        return ""
      },
      onCellValueChanged: ( _event: NewValueParams ) => {
        dirty.value = true
      },
    },
    {
      editable: true,
      headerName: "Time (m:ss.SS)",
      cellEditor: "agTextCellEditor",
      cellEditorParams: { maxLength: 8 },
      filter: false,
      valueGetter: ( params: ValueGetterParams ) => {
        return params.data.timeString
      },
      valueSetter: ( params: ValueSetterParams ): boolean => {
        params.data.time = timeToSeconds( params.newValue )
        params.data.timeString = secondsToTime( params.data.time )
        return true
      },
      getQuickFilterText: ( _params: GetQuickFilterTextParams ) => {
        return ""
      },
      onCellValueChanged: ( _event: NewValueParams ) => {
        dirty.value = true
      },
    },
  ] )

  const areaFromScope = ( scope: string ) => {
    if ( scope === "county" )
      return swimmer.value.county
    if ( scope === "regional" )
      return swimmer.value.region
    if ( scope === "national" )
      return swimmer.value.nationality
    return ""
  }

  const updateFilters = ( swimmer: Swimmer ) => {
    const compAge = getCompetitionAge( parseISO( swimmer.birthday ) )
    ages.value = Array.from( { length: 4 }, ( _, i ) => compAge - 1 + i ).map( year => ( { value: String( year ) } ) )

    selections.value = {
      year: years.find( year => year.value === filterYear ) ?? years[0],
      scope: selections.value.scope,
      gender: genders.find( gender => gender.value === swimmer.gender ) ?? genders[0],
      age: ages.value.find( age => age.value === String( compAge ) ) ?? ages.value[0],
    }
  }

  updateFilters( swimmer.value )

  watch( swimmer, ( newSwimmer ) => {
    updateFilters( newSwimmer )
  } )

  const autoSizeStrategy = {
    type: "fitGridWidth",
    defaultMinWidth: 100,
  }

</script>

<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">
          Qualifying
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          County and regional qualifying times for each event
        </p>
      </div>
      <div class="mt-4 sm:ml-8 sm:mt-0 sm:flex-none">
        <div class="min-w-24 pt-8">
          <button
            type="button"
            class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            :disabled="!dirty"
            @click="reset"
          >
            Reset
          </button>
        </div>
      </div>
      <div class="mt-4 sm:ml-4 sm:mt-0 sm:flex-none">
        <div class="min-w-24 pt-8">
          <button
            type="submit"
            class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            :disabled="!dirty"
            @click="save"
          >
            Save
          </button>
        </div>
      </div>
    </div>
    <div class="border-b border-gray-200 pb-5 sm:flex sm:items-center sm:justify-between">
      <div class="mt-3">
        <div class="flex items-center space-x-4">
          <div class="min-w-48">
            <UI-Listbox
              v-model="selections.year"
              :options="years"
              label="Year"
              placeholder="Choose Year"
            />
          </div>
          <div class="min-w-48">
            <UI-Listbox
              v-model="selections.scope"
              :options="scopes"
              label="Scope"
              placeholder="Choose Scope"
            />
          </div>
          <div class="min-w-48">
            <UI-Listbox
              v-model="selections.gender"
              :options="genders"
              label="Gender"
              placeholder="Choose Gender"
            />
          </div>
          <div class="min-w-48">
            <UI-Listbox
              v-model="selections.age"
              :options="ages"
              label="Age"
              placeholder="Choose Age"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4 flow-root">
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
    </div>
  </div>
</template>
