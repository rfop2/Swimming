<script setup lang="ts">
  import type { InternalApi } from "nitropack"
  import type { CellValueChangedEvent, GetQuickFilterTextParams, IRowNode, NewValueParams, ValueFormatterParams, ValueGetterParams, ValueSetterParams } from "ag-grid-community"
  import "ag-grid-community/styles/ag-grid.css" // Mandatory CSS required by the Data Grid
  import "ag-grid-community/styles/ag-theme-quartz.css" // Optional Theme applied to the Data Grid
  import { AgGridVue } from "ag-grid-vue3" // Vue Data Grid Component
  import { type Swimmer, secondsToTime, strokeSort, timeToSeconds, type QualifyingRow, getCompetitionAge, REGIONS, COUNTIES, NATIONALITIES, STROKE_DISTANCE, AGES, getSwimmerScopeArea } from "lib"
  import { addMonths, format, getYear, parseISO } from "date-fns"
  import type { FetchError } from "ofetch"
  import { ArrowUturnLeftIcon, CheckIcon, ClipboardDocumentCheckIcon, ClipboardDocumentIcon, ClipboardDocumentListIcon, DocumentPlusIcon, PlusCircleIcon, TrashIcon } from "@heroicons/vue/24/outline"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Qualifying",
    meta: [
      { name: "description", content: "View and manage county and regional qualifying times" }
    ]
  } )

  const { swimmer } = useSwimmer()

  const user = useAuthenticatedUser()

  type ApiResponse = InternalApi["/api/qualifying"]["get"]

  interface ExtQualifyingRow extends QualifyingRow {
    distanceMetres: number
  }

  const transformQualifying = ( data: ApiResponse ): Array<ExtQualifyingRow> => {
    const extData = data.map( row => ( {
      ...row,
      ...{
        time: row.time || timeToSeconds( row.timeString ),
        timeString: row.timeString.replace( /^0+:?/, "" ),
        distanceMetres: Number( row.distance.replace( /m$/, "" ) )
      }
    } ) )
    return extData
  }

  const { data: qualifying } = await useFetch(
    "/api/qualifying",
    {
      key: "qualifying",
      transform: transformQualifying,
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
    /* {
      value: "national",
      label: "National",
    }, */
  ]

  const areasFromScope = ( scope: string ) => {
    if ( scope === "county" )
      return Object.entries( COUNTIES ).map( ( [ k, v ] ) => ( { label: v, value: k } ) )
    if ( scope === "regional" )
      return Object.entries( REGIONS ).map( ( [ k, v ] ) => ( { label: v, value: k } ) )
    if ( scope === "national" )
      return Object.entries( NATIONALITIES ).map( ( [ k, v ] ) => ( { label: v, value: k } ) )
    return []
  }

  const genders = [
    {
      value: "male",
      label: "Open/Male",
    },
    {
      value: "female",
      label: "Female",
    },
  ]

  const ages = ref<Array<{ value: string }>>( user.value.admin ? AGES.map( age => ( { value: age } ) ) : [] )

  const courses = [
    {
      value: "lc",
      label: "Long",
    },
    {
      value: "sc",
      label: "Short",
    },
  ]

  const selections = ref( {
    year: years[0].value,
    scope: scopes[0].value,
    area: "",
    gender: "",
    age: ages.value[0].value,
    course: courses[0].value,
  } )

  const areas = computed( () => areasFromScope( selections.value.scope ) )

  const filterArea = computed( () => selections.value.area )

  const added = ref<Array<ExtQualifyingRow>>( [] )
  const deleted = ref<Array<ExtQualifyingRow>>( [] )

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
      if ( row.year !== selections.value.year )
        return false
      if ( row.scope !== selections.value.scope )
        return false
      if ( row.area !== filterArea.value )
        return false
      if ( row.gender !== selections.value.gender )
        return false
      if ( row.age !== selections.value.age )
        return false
      return true
    } )
    filtered.sort( ( a, b ) => {
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
    return filtered
  } )

  watch( filteredQualifying, fq => {
    if ( fq.length > 0 ) {
      selections.value.course = ( courses.find( course => course.value === fq[0].course ) ?? courses[0] ).value
    }
  }, { deep: true } )

  const clipboard = ref<Array<ExtQualifyingRow>>( [] )

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
        gender: selections.value.gender,
        age: selections.value.age,
      } } )
    }
    dirty.value = true
  }

  async function generate( _e: Event ) {
    const created = format( new Date(), "yyyy-MM-dd" )
    const addedData = []
    for ( const strokeDistance of Object.keys( STROKE_DISTANCE ) ) {
      const matches = strokeDistance.toLocaleLowerCase().match( /(?<stroke>\w+)__(?<distance>\d+m)$/ )
      if ( !matches ) {
        throw new Error( `Can't match stroke/distance on '${strokeDistance}'` )
      }
      const { stroke = "", distance = "" } = { ...matches?.groups }
      addedData.push( {
        created,
        year: selections.value.year,
        course: selections.value.course,
        stroke,
        distance,
        scope: selections.value.scope,
        area: selections.value.area,
        gender: selections.value.gender,
        age: selections.value.age,
        timeString: "0",
        time: 0
      } )
    }
    added.value = added.value.concat( transformQualifying( addedData ) )
    dirty.value = true
    console.log( addedData )
  }

  async function complete( _e: Event ) {
    const created = format( new Date(), "yyyy-MM-dd" )
    const addedData = []
    for ( const strokeDistance of Object.keys( STROKE_DISTANCE ) ) {
      const matches = strokeDistance.toLocaleLowerCase().match( /(?<stroke>\w+)__(?<distance>\d+m)$/ )
      if ( !matches ) {
        throw new Error( `Can't match stroke/distance on '${strokeDistance}'` )
      }
      const { stroke = "", distance = "" } = { ...matches?.groups }
      if ( !filteredQualifying.value.find( row => row.stroke === stroke && row.distance === distance ) ) {
        addedData.push( {
          created,
          year: selections.value.year,
          course: selections.value.course,
          stroke,
          distance,
          scope: selections.value.scope,
          area: selections.value.area,
          gender: selections.value.gender,
          age: selections.value.age,
          timeString: "0",
          time: 0
        } )
      }
    }
    added.value = added.value.concat( transformQualifying( addedData ) )
    dirty.value = true
  }

  async function reset( _e: Event ) {
    added.value = []
    await refreshNuxtData( "qualifying" )
    deleted.value = []
    added.value = []
    clipboard.value = []
    dirty.value = false
  }

  const saveSuccess = ref( false )
  async function save( _e: Event ) {
    try {
      await $fetch( "/api/qualifying", {
        method: "PUT",
        body: JSON.stringify( ( qualifying.value ?? [] ).concat( added.value.filter( data => data.time > 0 ) ) ),
      } )
      saveSuccess.value = true
      await refreshNuxtData( "qualifying" )
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
    /* {
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
    }, */
    {
      editable: () => !!user.value.admin,
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

  const swimmerAreaSelection = ( swimmer: Swimmer, scope: string ) => {
    const swimmerArea = getSwimmerScopeArea( swimmer, scope )
    return ( areas.value.find( area => area.value === swimmerArea ) ?? areas.value[0] ).value
  }

  const updateFilters = ( swimmer: Swimmer ) => {
    const compAge = getCompetitionAge( parseISO( swimmer.birthday ) )
    const qualifyingAge = compAge < Number( AGES[0] ) ? String( AGES[0] ) : ( compAge > Number( AGES[AGES.length - 2] ) ? "Open" : String( compAge ) )
    if ( !user.value.admin ) {
      const ageIndex = AGES.findIndex( age => age === String( qualifyingAge ) )
      ages.value = AGES.slice( Math.max( ageIndex - 1, 0 ), Math.min( ageIndex + 2, AGES.length ) ).map( age => ( { value: age } ) )
      console.log( "AV", AGES, compAge, qualifyingAge, ageIndex, ages.value )
    }

    selections.value = {
      year: ( years.find( year => year.value === filterYear ) ?? years[0] ).value,
      scope: selections.value.scope,
      area: ( swimmerAreaSelection( swimmer, selections.value.scope ) ),
      gender: ( genders.find( gender => gender.value === swimmer.gender ) ?? genders[0] ).value,
      age: ( ages.value.find( age => age.value === qualifyingAge ) ?? ages.value[0] ).value,
      course: selections.value.course,
    }
  }

  watchEffect( () => {
    if ( swimmer.value ) {
      updateFilters( swimmer.value )
    }
  } )

  watch( () => selections.value.scope, newScope => {
    if ( swimmer.value ) {
      selections.value.area = swimmerAreaSelection( swimmer.value, newScope )
    }
  }, {
    immediate: true,
  } )

  const autoSizeStrategy = {
    type: "fitGridWidth",
    defaultMinWidth: 100,
  }

</script>

<template>
  <StandardPage
    title="Qualifying"
  >
    <template #description>
      <div class="sm:flex sm:justify-between">
        <div>County and regional qualifying times for each event</div>
        <div
          v-if="user.admin"
          class="sm:flex sm:items-end"
        >
          <div
            v-if="filteredQualifying.length"
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
            v-if="clipboard.length && !filteredQualifying.length"
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
            v-if="filteredQualifying.length"
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
          <div
            v-if="!filteredQualifying.length"
            class="mt-4 sm:ml-4 sm:mt-0 sm:flex-none"
          >
            <button
              type="button"
              class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              title="Fill with default events"
              @click="generate"
            >
              <DocumentPlusIcon
                class="-ml-0.5 size-5"
                aria-hidden="true"
              />
              Populate
            </button>
          </div>
          <div
            v-if="filteredQualifying.length>0 && filteredQualifying.length!==Object.keys(STROKE_DISTANCE).length"
            class="mt-4 sm:ml-4 sm:mt-0 sm:flex-none"
          >
            <button
              type="button"
              class="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              title="Add any missing strokes/distances"
              @click="complete"
            >
              <PlusCircleIcon
                class="-ml-0.5 size-5"
                aria-hidden="true"
              />
              Complete
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
      <SwimmerSelector v-model="swimmer" />
      <div class="min-w-24">
        <UI-Listbox
          v-model="selections.year"
          :options="years"
          label="Year"
          placeholder="Choose Year"
        />
      </div>
      <div class="min-w-32">
        <UI-Listbox
          v-model="selections.scope"
          :options="scopes"
          label="Scope"
          placeholder="Choose Scope"
        />
      </div>
      <div
        v-if="user.admin"
        class="min-w-48"
      >
        <UI-Listbox
          v-model="selections.area"
          :options="areas"
          label="Area"
          placeholder="Choose Area"
        />
      </div>
      <div class="min-w-28">
        <UI-Listbox
          v-model="selections.gender"
          :options="genders"
          label="Gender"
          placeholder="Choose Gender"
        />
      </div>
      <div class="min-w-28">
        <UI-Listbox
          v-model="selections.age"
          :options="ages"
          label="Age"
          placeholder="Choose Age"
        />
      </div>
      <div
        v-if="user.admin"
        class="min-w-28"
      >
        <UI-Listbox
          v-model="selections.course"
          :options="courses"
          label="Course"
          placeholder="Choose Course"
          :disabled="filteredQualifying.length>0"
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
      text="Qualifying times have been updated."
    />
  </StandardPage>
</template>
