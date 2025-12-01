<script setup lang="ts">
  import type { ValueGetterParams } from "ag-grid-community"
  import { ModuleRegistry, DateEditorModule, ValidationModule, ClientSideRowModelModule, ColumnAutoSizeModule, TextFilterModule, CustomEditorModule, CellStyleModule, TextEditorModule, RowAutoHeightModule } from "ag-grid-community"
  import { AgGridVue } from "ag-grid-vue3" // Vue Data Grid Component
  import { REGIONS, COUNTIES, type ScopeType, scopeTypes, genderTypes, type QualifyingType, type GenderType } from "lib"
  import { addMonths, format, getYear } from "date-fns"

  import type { InternalApi } from "nitropack"

  // ModuleRegistry.registerModules( [ AllCommunityModule ] )
  ModuleRegistry.registerModules( [
    ClientSideRowModelModule,
    ColumnAutoSizeModule,
    TextFilterModule,
    CellStyleModule,
    CustomEditorModule,
    TextEditorModule,
    DateEditorModule,
    RowAutoHeightModule,
    ...( process.env.NODE_ENV !== "production" ? [ ValidationModule ] : [] ),
  ] )

  definePageMeta( {
    layout: "secure",
    middleware: [ "admin" ]
  } )

  const description = "Qualifying matrix showing completed and outstanding dates and times."
  useHead( {
    title: "Qualifying Matrix",
    meta: [
      { name: "description", content: description }
    ]
  } )

  const filterYear = getYear( addMonths( new Date(), 3 ) )

  const years = Array.from( { length: 4 }, ( _, i ) => filterYear - 1 + i )
  const yearOptions = years.map( year => ( { value: year } ) )

  // const yearOptions = computed( () => Array.from( new Set( Array.from( coverage.value.map( c => c.year ) ) ) ).sort().map( year => ( { value: year } ) ) )
  type ApiResponse = InternalApi["/api/qualifying/matrix"]["get"]

  const { data: completed } = await useFetch<ApiResponse>(
    "/api/qualifying/matrix",
    {
      key: "qualifying-matrix",
    }
  )

  const coverage = computed( () => {
    const coverage = []
    for ( const scope of scopeTypes ) {
      const areas = scope === "regional"
        ? Object.entries( REGIONS ).slice( 1 ).filter( ( [ code ] ) => code.length === 1 )
        : Object.entries( COUNTIES ).slice( 1 )
      for ( const [ code, name ] of areas ) {
        const datesCoverage = ( completed.value?.periods ?? [] ).filter( row => row.scope === scope && row.area === code )
        const timesCoverage = ( completed.value?.times ?? [] ).filter( row => row.scope === scope && row.area === code )
        console.log( code, name, datesCoverage, timesCoverage )
        const datesYears = new Set( Array.from( datesCoverage.map( dc => dc.year ) ) )
        const timesYears = new Set( Array.from( timesCoverage.map( tc => tc.year ) ) )
        // const datesYears = new Map( Array.from( datesCoverage.map( dc => ( [ dc.year, dc ] ) ) ) )
        // const timesYears = new Map( Array.from( timesCoverage.map( tc => ( [ tc.year, tc ] ) ) ) )
        // const years = Array.from( new Set( [ ...datesYears, ...timesYears ] ) )
        // years.sort()
        console.log( years, datesYears, timesYears )
        for ( const year of years ) {
          const yearInfo = {
            year,
            scope,
            area: code,
            areaName: name,
            types: {}
          } as {
            year: number
            scope: ScopeType
            area: string
            areaName: string
            types: Partial<Record<QualifyingType, {
              dates?: ApiResponse["periods"][number]
              times?: Record<GenderType, ApiResponse["times"][number] | undefined>
            }>>
          }
          const types = Array.from( new Set( [ ...Array.from( datesCoverage.map( ( dc ): QualifyingType => dc.type ) ), ...Array.from( timesCoverage.map( ( tc ): QualifyingType => tc.type ) ) ] ) )
          for ( const type of types ) {
            console.log( genderTypes.map( gender => [ gender, timesCoverage.find( row => row.year === year && row.type === type && row.gender === gender ) ] ) )
            console.log( Object.fromEntries( genderTypes.map( gender => [ gender, timesCoverage.find( row => row.year === year && row.type === type && row.gender === gender ) ] ) ) )
            yearInfo.types[type] = {
              dates: datesCoverage.find( row => row.year === year && row.type === type ),
              times: Object.fromEntries( genderTypes.map( gender => [ gender, timesCoverage.find( row => row.year === year && row.type === type && row.gender === gender ) ] ) ) as Record<GenderType, ApiResponse["times"][number] | undefined>,
            }
          }
          coverage.push( yearInfo )
        }
      }
    }
    coverage.sort( ( a, b ) => {
      const yearDiff = a.year - b.year
      if ( yearDiff ) return yearDiff
      const scopeDiff = a.scope.localeCompare( b.scope )
      if ( scopeDiff ) return -scopeDiff
      const nameDiff = a.areaName.localeCompare( b.areaName )
      if ( nameDiff ) return nameDiff
      return 0
    } )
    return coverage
  } )

  watchEffect( () => {
    console.log( "C", coverage.value )
  } )

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

  const selections = ref( {
    year: yearOptions[1]!.value,
    scope: scopeOptions[0].value,
    area: "",
  } )

  const areas = computed( () => areasFromScope( selections.value.scope as ScopeType ) )

  const filteredCoverage = computed( () => {
    const filtered = coverage.value.filter( row => {
      if ( row.year !== selections.value.year )
        return false
      if ( selections.value.scope && ( row.scope !== selections.value.scope ) )
        return false
      if ( selections.value.area && ( row.area !== selections.value.area ) )
        return false
      // if ( selections.value.type.length && !selections.value.type.includes( row.type ) )
      // return false
      return true
    } )
    filtered.sort( ( a, b ) => {
      const diff1 = a.year - b.year
      if ( diff1 !== 0 ) return diff1
      const diff2 = a.scope.localeCompare( b.scope )
      if ( diff2 !== 0 ) return diff2
      const diff3 = a.areaName.localeCompare( b.areaName )
      if ( diff3 !== 0 ) return diff3
      // const diff4 = a.type.localeCompare( b.type )
      // if ( diff4 !== 0 ) return diff4
      return 0
    } )
    return filtered
  } )

  const regionalCoverage = computed( () => filteredCoverage.value.filter( row => row.scope === "regional" ) )
  const countyCoverage = computed( () => filteredCoverage.value.filter( row => row.scope === "county" ) )

  watchEffect( () => {
    console.log( "FC", filteredCoverage.value )
  } )

  const defaultColumnAttrs = {
    type: "rightAligned",
    editable: false,
    filter: "agTextColumnFilter",
    filterParams: {
      maxNumConditions: 1,
    }
  }

  const formatDates = ( startDate?: string, endDate?: string ) => {
    // const FORMAT = "do, MMM, yyyy"
    const FORMAT = "dd/MM/yyyy"
    if ( startDate && endDate ) {
      return `${format( startDate, FORMAT )} - ${format( endDate, FORMAT )}`
    } else if ( startDate ) {
      return `${format( startDate, FORMAT )} - ???`
    } else if ( endDate ) {
      return `??? - ${format( endDate, FORMAT )}`
    }
    return ""
  }

  const regionalColumns = computed( () => [
    {
      field: "year",
      filter: false,
    },
    {
      field: "areaName",
      filter: false,
    },
    {
      headerName: "Summer Dates",
      filter: false,
      valueGetter: ( params: ValueGetterParams<typeof regionalCoverage.value[number]> ) => {
        if ( !params.data ) return ""
        const summer = params.data.types.summer
        if ( !summer ) return ""
        const dates = summer.dates
        if ( !dates ) return ""
        return formatDates( dates.qualifyingStart, dates.qualifyingEnd )
      }
    },
    {
      headerName: "Summer Times",
      filter: false,
      cellRenderer: ( params: ValueGetterParams<typeof regionalCoverage.value[number]> ) => {
        if ( !params.data ) return ""
        const summer = params.data.types.summer
        if ( !summer ) return ""
        const times = summer.times
        if ( !times ) return ""
        const male = times.male?.ages
        const female = times.female?.ages
        return [ male ? `M: ${male}` : undefined, female ? `F: ${female}` : undefined ].filter( v => !!v ).join( "<br>" )
      },
      wrapText: true,
      autoHeight: true,
    },
    {
      headerName: "Winter Dates",
      filter: false,
      valueGetter: ( params: ValueGetterParams<typeof regionalCoverage.value[number]> ) => {
        if ( !params.data ) return ""
        const winter = params.data.types.winter
        if ( !winter ) return ""
        const dates = winter.dates
        if ( !dates ) return ""
        return formatDates( dates.qualifyingStart, dates.qualifyingEnd )
      }
    },
    {
      headerName: "Winter Times",
      filter: false,
      cellRenderer: ( params: ValueGetterParams<typeof regionalCoverage.value[number]> ) => {
        if ( !params.data ) return ""
        const winter = params.data.types.winter
        if ( !winter ) return ""
        const times = winter.times
        if ( !times ) return ""
        const male = times.male?.ages
        const female = times.female?.ages
        return [ male ? `M: ${male}` : undefined, female ? `F: ${female}` : undefined ].filter( v => !!v ).join( "<br>" )
      },
      wrapText: true,
      autoHeight: true,
    },
  ] )

  const countyColumns = computed( () => [
    {
      field: "year",
      filter: false,
    },
    {
      field: "areaName",
      filter: false,
    },
    {
      headerName: "Dates",
      filter: false,
      valueGetter: ( params: ValueGetterParams<typeof regionalCoverage.value[number]> ) => {
        if ( !params.data ) return ""
        const general = params.data.types.general
        if ( !general ) return ""
        const dates = general.dates
        if ( !dates ) return ""
        return formatDates( dates.qualifyingStart, dates.qualifyingEnd )
      }
    },
    {
      headerName: "Times",
      filter: false,
      cellRenderer: ( params: ValueGetterParams<typeof regionalCoverage.value[number]> ) => {
        if ( !params.data ) return ""
        const general = params.data.types.general
        if ( !general ) return ""
        const times = general.times
        if ( !times ) return ""
        const male = times.male?.ages
        const female = times.female?.ages
        return [ male ? `M: ${male}` : undefined, female ? `F: ${female}` : undefined ].filter( v => !!v ).join( "<br>" )
      },
      // wrapText: true,
      autoHeight: true,
    },
  ] )
</script>

<template>
  <StandardPage
    title="Qualifying Dates / Times Coverage"
  >
    <template #description>
      <div class="sm:flex sm:justify-between">
        <div>{{ description }}</div>
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
    </template>
    <div
      v-if="regionalCoverage.length"
      class="overflow-x-auto mx-auto max-w-7xl mb-4"
    >
      <ag-grid-vue
        :auto-size-strategy="{ type: 'fitCellContents' }"
        :default-col-def="defaultColumnAttrs"
        :row-data="regionalCoverage"
        :column-defs="regionalColumns"
        dom-layout="autoHeight"
        class="ag-theme-quartz"
      />
    </div>
    <div
      v-if="countyCoverage.length"
      class="overflow-x-auto mx-auto max-w-4xl"
    >
      <ag-grid-vue
        :auto-size-strategy="{ type: 'fitCellContents' }"
        :default-col-def="defaultColumnAttrs"
        :row-data="filteredCoverage.filter( row => row.scope === 'county' )"
        :column-defs="countyColumns"
        dom-layout="autoHeight"
        class="ag-theme-quartz"
      />
    </div>
  </StandardPage>
</template>
