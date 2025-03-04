<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import { XMarkIcon } from "@heroicons/vue/24/outline"
  import type { GetQuickFilterTextParams, IRowNode, NewValueParams, ValueFormatterParams, ValueGetterParams, ValueSetterParams } from "ag-grid-community"
  import "ag-grid-community/styles/ag-grid.css" // Mandatory CSS required by the Data Grid
  import "ag-grid-community/styles/ag-theme-quartz.css" // Optional Theme applied to the Data Grid
  import { AgGridVue } from "ag-grid-vue3" // Vue Data Grid Component
  import { type Swimmer, secondsToTime, strokeSort, timeToSeconds, type QualifyingRow, getCompetitionAge } from "lib"
  import { addMonths, getYear, parseISO } from "date-fns"
  import type { FetchError } from "ofetch"

  definePageMeta( {
    layout: "secure",
    // middleware: [ "protected" ]
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

  const columns = ref( [
    {
      field: "year",
    },
    {
      field: "area",
      valueFormatter: ( { value }: ValueFormatterParams ) => value === "sw" ? "South West" : "Gloucestershire",
      filterValueGetter: ( params: ValueGetterParams ) => {
        return params.data.area === "sw" ? "South West" : "Gloucestershire"
      },
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

  const generateQuickFilter = ( swimmer: Swimmer ) => {
    const filterYear = getYear( addMonths( new Date(), 1 ) )
    return String( filterYear ) + " " + swimmer.gender + " " + String( getCompetitionAge( parseISO( swimmer.birthday ) ) )
  }

  const initialFilter = generateQuickFilter( swimmer.value )
  const quickFilter = ref( initialFilter )

  watch( swimmer, ( newSwimmer ) => {
    quickFilter.value = generateQuickFilter( newSwimmer )
  } )

  const quickFilterMatcher = ( quickFilterParts: Array<string>, rowQuickFilterAggregateText: string ) => {
    return quickFilterParts.every( element => rowQuickFilterAggregateText.split( /\n/ ).includes( element ) )
    // return quickFilterParts.every( part => rowQuickFilterAggregateText.match( part ) )
  }

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
      <div class="sm:flex-auto">
        <h5 class="text-sm font-medium leading-6 text-gray-900">
          Filter
        </h5>
        <div class="mt-2">
          <div class="relative">
            <input
              id="filter"
              v-model="quickFilter"
              type="text"
              required
              class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
            <button
              type="button"
              class="absolute top-1/2 right-2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              onclick="this.previousElementSibling.value = ''"
            >
              <XMarkIcon
                class="block h-6 w-6"
                @click="quickFilter=''"
              />
            </button>
          </div>
        </div>
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
    <div class="mt-4 flow-root">
      <div class="overflow-x-auto">
        <ag-grid-vue
          :quick-filter-matcher="quickFilterMatcher"
          :auto-size-strategy="autoSizeStrategy"
          :default-col-def="defaultColumnAttrs"
          :row-data="qualifying"
          :column-defs="columns"
          :quick-filter-text="quickFilter"
          dom-layout="autoHeight"
          class="ag-theme-quartz"
          @cell-value-changed="( event ) => {
            console.log( 'Data changed', event )
          }"
        />
      </div>
    </div>
  </div>
</template>
