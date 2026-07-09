<script setup lang="ts">
  import { ref, computed } from "vue"
  import { useRouter } from "vue-router"
  import StandardPage from "~/components/StandardPage.vue"
  import { addMonths, getYear } from "date-fns"
  import { REGIONS, COUNTIES, NATIONALITIES } from "lib"
  import type { QualifyingType } from "lib"

  import TableFemaleEventMale from "~/components/TableFemaleEventMale.vue"
  import TableMaleFemaleOpen from "~/components/TableMaleFemaleOpen.vue"
  import TableMaleOpen from "~/components/TableMaleOpen.vue"
  import TableXlsx from "~/components/TableXlsx.vue"
  import TableFemaleMaleBothCourse from "~/components/TableFemaleMaleBothCourse.vue"
  import TableAcceptedConsidered from "~/components/TableAcceptedConsidered.vue"
  import TableFemaleMale from "~/components/TableFemaleMale.vue"
  import TableFemaleMaleBerkshire from "~/components/TableFemaleMaleBerkshire.vue"
  import TableLongShortWhite from "~/components/TableLongShortWhite.vue"
  import TableFemaleMaleCornwall from "~/components/TableFemaleMaleCornwall.vue"
  import TableMaleFemaleCornwallTogether from "~/components/TableMaleFemaleCornwallTogether.vue"
  import TableWCSA from "~/components/TableWCSA.vue"
  import TableSussexCounty from "~/components/TableSussexCounty.vue"
  import TableWiltshire from "~/components/TableWiltshire.vue"

  definePageMeta( {
    layout: "secure",
    middleware: [ "admin" ]
  } )

  const filterYear = getYear( addMonths( new Date(), 1 ) )

  // options SEM mudar, continuam { value, label }
  const years = Array.from( { length: 6 }, ( _, i ) => filterYear - 3 + i ).map(
    year => ( { value: year, label: String( year ) } )
  )

  const scopes = [
    { value: "county", label: "County" },
    { value: "regional", label: "Regional" },
    { value: "national", label: "National" }
  ]

  const areasFromScope = ( scope: string ) => {
    if ( scope === "county" ) {
      return Object.entries( COUNTIES ).map( ( [ k, v ] ) => ( { value: k, label: v } ) )
    }
    if ( scope === "regional" ) {
      return Object.entries( REGIONS ).map( ( [ k, v ] ) => ( { value: k, label: v } ) )
    }
    if ( scope === "national" ) {
      return Object.entries( NATIONALITIES ).map( ( [ k, v ] ) => ( { value: k, label: v } ) )
    }
    return []
  }

  const courses = [
    { value: "lc", label: "Long" },
    { value: "sc", label: "Short" },
    { value: "both", label: "Both" }
  ]

  const regionalTypes: Array<{ value: QualifyingType, label: string }> = [
    { value: "summer", label: "Summer" },
    { value: "winter", label: "Winter" }
  ]

  type Selections = {
    year: number
    scope: string
    area: string | null
    course: string
    type: QualifyingType
    qualifyingStart: string
    qualifyingEnd: string | null
    lastRaceDate: string | null
  }

  const selections = ref<Selections>( {
    year: years[0].value,
    scope: scopes[0].value,
    area: null,
    course: courses[0].value,
    type: "general",
    qualifyingStart: "",
    qualifyingEnd: null,
    lastRaceDate: null,
  } )

  const areas = computed( () => areasFromScope( selections.value.scope ) )

  // When scope changes, keep type consistent
  watch(
    () => selections.value.scope,
    scope => {
      if ( scope === "regional" ) {
        if ( selections.value.type === "general" ) {
          selections.value.type = "summer"
        }
      } else {
        selections.value.type = "general"
      }
      selections.value.area = null
    }
  )

  const fileUploaded = ref( false )
  const router = useRouter()
  const fileInput = ref<HTMLInputElement | null>( null )
  const file = ref<File | null>( null )
  const fileType = ref<"pdf" | "xlsx" | "">( "" )
  const pdfText = ref( "" )

  const selectedLayoutIndex = ref<number | null>( null )
  const currentLayoutIndex = ref( 0 )

  const layoutsPdf = [
    { component: TableFemaleEventMale, id: "layout1" },
    { component: TableMaleFemaleOpen, id: "layout2" },
    { component: TableMaleOpen, id: "layout3" },
    { component: TableFemaleMaleBothCourse, id: "layout4" },
    { component: TableAcceptedConsidered, id: "layout5" },
    { component: TableFemaleMale, id: "layout6" },
    { component: TableFemaleMaleBerkshire, id: "layout7" },
    { component: TableLongShortWhite, id: "layout8" },
    { component: TableFemaleMaleCornwall, id: "layout9" },
    { component: TableMaleFemaleCornwallTogether, id: "layout10" },
    { component: TableWCSA, id: "layout11" },
    { component: TableSussexCounty, id: "layout12" },
    { component: TableWiltshire, id: "layout13" }
  ]

  const layoutsXlsx = [ { component: TableXlsx, id: "xlsx" } ]

  const layouts = computed( () =>
    fileType.value === "xlsx" ? layoutsXlsx : layoutsPdf
  )

  const currentLayoutComponent = computed(
    () => layouts.value[currentLayoutIndex.value].component
  )

  function selectLayout( index: number ) {
    selectedLayoutIndex.value = index
  }

  function nextLayout() {
    if ( currentLayoutIndex.value < layouts.value.length - 1 ) {
      currentLayoutIndex.value++
    }
  }

  function prevLayout() {
    if ( currentLayoutIndex.value > 0 ) {
      currentLayoutIndex.value--
    }
  }

  async function sendFile() {
    if ( !file.value ) {
      alert( "Please select a file" )
      return
    }
    if ( selectedLayoutIndex.value === null ) {
      alert( "Please select a layout" )
      return
    }

    const formData = new FormData()
    formData.append( "pdf_file", file.value )
    formData.append( "layout", layouts.value[selectedLayoutIndex.value].id )

    const res = await $fetch( "/api/import", {
      method: "POST",
      body: formData
    } )

    const mergedData = {
      structured: res.structured,
      selections: selections.value
    }

    sessionStorage.setItem( "parsedData", JSON.stringify( mergedData ) )
    router.push( "/parsed" )
  }

  function handleFileUpload() {
    if ( !fileInput.value?.files?.length ) return

    file.value = fileInput.value.files[0]

    const name = file.value.name.toLowerCase()
    if ( name.endsWith( ".pdf" ) ) fileType.value = "pdf"
    else if ( name.endsWith( ".xlsx" ) ) fileType.value = "xlsx"
    else {
      alert( "Unsupported file type. Please upload PDF or XLSX." )
      fileInput.value.value = ""
      return
    }

    fileUploaded.value = true
    currentLayoutIndex.value = 0
    selectedLayoutIndex.value = null
  }

  function resetUpload() {
    fileUploaded.value = false
    fileType.value = ""
    currentLayoutIndex.value = 0
    selectedLayoutIndex.value = null
    file.value = null
  }
</script>

<template>
  <StandardPage title="Import">
    <template #description>
      <div class="flex flex-col space-y-2">
        <div>Upload files for each event (PDF or XLSX)</div>

        <div v-if="file">
          <button
            class="px-4 py-2 bg-gray-300 text-black rounded mb-4 hover:bg-gray-400"
            @click="resetUpload"
          >
            Change file
          </button>
        </div>

        <div v-if="!file">
          <button
            class="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
            @click="$refs.fileInput.click()"
          >
            Choose File
          </button>
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            @change="handleFileUpload"
          >
        </div>

        <div
          v-else
          class="flex flex-col items-center justify-center"
        >
          <h1
            v-if="selectedLayoutIndex == null"
            class="text-3xl font-bold pb-10 mt-10"
          >
            Please choose a layout similar to your {{ fileType.toUpperCase() }}
            file
          </h1>
          <h1
            v-else
            class="text-3xl font-bold pb-10 mt-10"
          >
            Please choose a year, scope, area and course
          </h1>

          <div
            v-if="file"
            class="mb-4 text-gray-700 font-medium"
          >
            Selected file:
            <span class="font-semibold">{{ file.name }}</span>
          </div>

          <div class="mb-4">
            <div
              v-if="selectedLayoutIndex !== null"
              class="flex flex-row space-x-4 mb-4"
            >
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

              <div class="min-w-48">
                <UI-Listbox
                  v-model="selections.area"
                  :options="areas"
                  label="Area"
                  placeholder="Choose Area"
                />
              </div>

              <div
                v-if="selections.scope === 'regional'"
                class="min-w-32"
              >
                <UI-Listbox
                  v-model="selections.type"
                  :options="regionalTypes"
                  label="Type"
                  placeholder="Choose Type"
                />
              </div>

              <div class="min-w-28">
                <UI-Listbox
                  v-model="selections.course"
                  :options="courses"
                  label="Course"
                  placeholder="Choose Course"
                />
              </div>
            </div>

            <div
              v-if="selectedLayoutIndex !== null && (selections.scope === 'county' || selections.scope === 'regional')"
              class="flex flex-wrap gap-4"
            >
              <div class="min-w-36">
                <UI-Input
                  v-model="selections.qualifyingStart"
                  label="Qualifying Start Date"
                  type="date"
                  required
                />
              </div>
              <div class="min-w-36">
                <UI-Input
                  v-model="selections.qualifyingEnd"
                  label="Qualifying End Date"
                  type="date"
                />
              </div>
              <div class="min-w-36">
                <UI-Input
                  v-model="selections.lastRaceDate"
                  label="Last Race Date"
                  type="date"
                />
              </div>
            </div>

            <button
              v-if="selectedLayoutIndex === null"
              class="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              @click="selectLayout(currentLayoutIndex)"
            >
              Select this layout
            </button>
          </div>

          <div
            v-if="
              selectedLayoutIndex !== null &&
                selections.year &&
                selections.scope &&
                selections.area &&
                selections.course &&
                (selections.scope === 'national' || selections.qualifyingStart)
            "
          >
            <button
              class="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
              @click="sendFile"
            >
              Upload
            </button>
          </div>

          <div
            v-if="selectedLayoutIndex === null"
            class="flex space-x-2 mb-4 justify-between"
          >
            <button
              :disabled="currentLayoutIndex === 0"
              class="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              @click="prevLayout"
            >
              Back
            </button>
            <button
              :disabled="currentLayoutIndex === layouts.length - 1"
              class="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              style="margin-left: 5rem;"
              @click="nextLayout"
            >
              Next
            </button>
          </div>

          <component
            :is="currentLayoutComponent"
            v-if="selectedLayoutIndex === null"
            class="mb-4"
          />
        </div>
      </div>
    </template>

    <div
      v-if="pdfText"
      class="mt-4 p-4 border rounded w-96 overflow-auto"
    >
      <pre>{{ pdfText }}</pre>
    </div>
  </StandardPage>
</template>
