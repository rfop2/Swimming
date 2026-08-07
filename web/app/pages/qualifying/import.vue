<script setup lang="ts">
  import { computed, nextTick, ref, watch, type Component } from "vue"
  import { addMonths, getYear } from "date-fns"
  import { COUNTIES, NATIONALITIES, REGIONS } from "lib"
  import type { QualifyingType } from "lib"
  import type { ImportLayoutDetection, ImportLayoutFileType, ImportLayoutMetadata } from "~~/shared/importLayoutCatalog"
  import { importLayoutCatalog } from "~~/shared/importLayoutCatalog"

  import StandardPage from "~/components/StandardPage.vue"
  import TableAcceptedConsidered from "~/components/TableAcceptedConsidered.vue"
  import TableFemaleEventMale from "~/components/TableFemaleEventMale.vue"
  import TableFemaleMale from "~/components/TableFemaleMale.vue"
  import TableFemaleMaleBerkshire from "~/components/TableFemaleMaleBerkshire.vue"
  import TableFemaleMaleBothCourse from "~/components/TableFemaleMaleBothCourse.vue"
  import TableFemaleMaleCornwall from "~/components/TableFemaleMaleCornwall.vue"
  import TableLongShortWhite from "~/components/TableLongShortWhite.vue"
  import TableLeicestershire from "~/components/TableLeicestershire.vue"
  import TableMaleFemaleCornwallTogether from "~/components/TableMaleFemaleCornwallTogether.vue"
  import TableMaleFemaleOpen from "~/components/TableMaleFemaleOpen.vue"
  import TableMaleOpen from "~/components/TableMaleOpen.vue"
  import TableNorfolk from "~/components/TableNorfolk.vue"
  import TableSuffolk from "~/components/TableSuffolk.vue"
  import TableSurrey from "~/components/TableSurrey.vue"
  import TableWarwickshire from "~/components/TableWarwickshire.vue"
  import TableHertfordshire from "~/components/TableHertfordshire.vue"
  import TableNorthamptonshire from "~/components/TableNorthamptonshire.vue"
  import TableSussexCounty from "~/components/TableSussexCounty.vue"
  import TableWCSA from "~/components/TableWCSA.vue"
  import TableWiltshire from "~/components/TableWiltshire.vue"
  import TableWiltshire2027 from "~/components/TableWiltshire2027.vue"
  import TableXlsx from "~/components/TableXlsx.vue"

  definePageMeta( {
    layout: "secure",
    middleware: [ "admin" ]
  } )

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

  type LayoutWithComponent = ImportLayoutMetadata & { component: Component }

  const layoutComponents: Record<string, Component> = {
    layout1: TableFemaleEventMale,
    layout2: TableMaleFemaleOpen,
    layout3: TableMaleOpen,
    layout4: TableFemaleMaleBothCourse,
    layout5: TableAcceptedConsidered,
    layout6: TableFemaleMale,
    layout7: TableFemaleMaleBerkshire,
    layout8: TableLongShortWhite,
    layout9: TableFemaleMaleCornwall,
    layout10: TableMaleFemaleCornwallTogether,
    layout11: TableWCSA,
    layout12: TableSussexCounty,
    layout13: TableWiltshire,
    layout14: TableNorfolk,
    layout15: TableSuffolk,
    layout16: TableLeicestershire,
    layout17: TableSurrey,
    layout18: TableWarwickshire,
    layout19: TableWiltshire2027,
    layout20: TableHertfordshire,
    layout21: TableNorthamptonshire,
    xlsx: TableXlsx,
  }

  const layouts: LayoutWithComponent[] = importLayoutCatalog.map( layout => ( {
    ...layout,
    component: layoutComponents[layout.id],
  } ) )

  const router = useRouter()
  const fileInput = ref<HTMLInputElement | null>( null )
  const file = ref<File | null>( null )
  const fileType = ref<ImportLayoutFileType | "">( "" )
  const detection = ref<ImportLayoutDetection | null>( null )
  const detecting = ref( false )
  const detectionError = ref( "" )
  const parsing = ref( false )
  const parseError = ref( "" )
  const selectedLayoutId = ref<string | null>( null )
  const previewLayoutId = ref<string | null>( null )

  const searchLayouts = ref( "" )
  const yearFilter = ref<number | "all">( "all" )
  const areaFilter = ref( "all" )
  const fileTypeFilter = ref<ImportLayoutFileType | "all">( "all" )
  const onlyCompatible = ref( false )

  const filterYear = getYear( addMonths( new Date(), 1 ) )
  const years = Array.from( { length: 8 }, ( _, index ) => filterYear - 3 + index ).map(
    year => ( { value: year, label: String( year ) } )
  )

  const scopes = [
    { value: "county", label: "County" },
    { value: "regional", label: "Regional" },
    { value: "national", label: "National" }
  ]

  const courses = [
    { value: "lc", label: "Long" },
    { value: "sc", label: "Short" },
    { value: "both", label: "Both" }
  ]

  const regionalTypes: Array<{ value: QualifyingType, label: string }> = [
    { value: "summer", label: "Summer" },
    { value: "winter", label: "Winter" }
  ]

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

  const areasFromScope = ( scope: string ) => {
    if ( scope === "county" ) return Object.entries( COUNTIES ).map( ( [ value, label ] ) => ( { value, label } ) )
    if ( scope === "regional" ) return Object.entries( REGIONS ).map( ( [ value, label ] ) => ( { value, label } ) )
    if ( scope === "national" ) return Object.entries( NATIONALITIES ).map( ( [ value, label ] ) => ( { value, label } ) )
    return []
  }

  const areas = computed( () => areasFromScope( selections.value.scope ) )
  const selectedLayout = computed( () => layouts.find( layout => layout.id === selectedLayoutId.value ) ?? null )
  const previewLayout = computed( () => layouts.find( layout => layout.id === previewLayoutId.value ) ?? null )
  const suggestedLayout = computed( () => layouts.find( layout => layout.id === detection.value?.suggestedLayoutId ) ?? null )
  const currentStep = computed( () => !file.value ? 1 : selectedLayout.value ? 3 : 2 )

  const catalogYears = computed( () => Array.from(
    new Set( importLayoutCatalog.flatMap( layout => layout.supportedYears ) )
  ).sort( ( a, b ) => b - a ) )

  const catalogAreas = computed( () => Array.from(
    new Map(
      importLayoutCatalog
        .filter( layout => layout.areaCode )
        .map( layout => [ layout.areaCode!, layout.areaLabel ] )
    ).entries()
  ).sort( ( a, b ) => a[1].localeCompare( b[1] ) ) )

  const filteredLayouts = computed( () => {
    const search = searchLayouts.value.trim().toLowerCase()
    const compatible = new Set( detection.value?.compatibleLayoutIds ?? [] )

    return layouts.filter( layout => {
      if ( search && !`${layout.name} ${layout.areaLabel} ${layout.description}`.toLowerCase().includes( search ) ) return false
      if ( yearFilter.value !== "all" && !layout.supportedYears.includes( yearFilter.value ) ) return false
      if ( areaFilter.value !== "all" && layout.areaCode !== areaFilter.value ) return false
      if ( fileTypeFilter.value !== "all" && layout.fileType !== fileTypeFilter.value ) return false
      if ( onlyCompatible.value && !compatible.has( layout.id ) ) return false
      return true
    } )
  } )

  const yearMismatch = computed( () =>
    !!detection.value?.detectedYear && Number( selections.value.year ) !== detection.value.detectedYear
  )

  const confidenceLabel = computed( () => {
    const value = detection.value?.confidence
    return value ? value.charAt( 0 ).toUpperCase() + value.slice( 1 ) : ""
  } )

  watch(
    () => selections.value.scope,
    scope => {
      if ( scope === "regional" ) {
        if ( selections.value.type === "general" ) selections.value.type = "summer"
      } else {
        selections.value.type = "general"
      }
      selections.value.area = null
    }
  )

  async function detectFile() {
    if ( !file.value ) return
    detecting.value = true
    detectionError.value = ""

    try {
      const formData = new FormData()
      formData.append( "import_file", file.value )
      const result = await $fetch<ImportLayoutDetection>( "/api/import/detect", {
        method: "POST",
        body: formData,
      } )
      detection.value = result

      if ( result.detectedYear ) {
        selections.value.year = result.detectedYear
        yearFilter.value = result.detectedYear
      }
      if ( result.dates.qualifyingStart ) selections.value.qualifyingStart = result.dates.qualifyingStart
      if ( result.dates.qualifyingEnd ) selections.value.qualifyingEnd = result.dates.qualifyingEnd
      if ( result.dates.lastRaceDate ) selections.value.lastRaceDate = result.dates.lastRaceDate

      previewLayoutId.value = result.suggestedLayoutId
      onlyCompatible.value = result.compatibleLayoutIds.length > 0
    } catch ( error ) {
      detectionError.value = ( error as Error )?.message || "Automatic detection failed. Please choose a layout manually."
      onlyCompatible.value = false
    } finally {
      detecting.value = false
    }
  }

  async function handleFileUpload() {
    const selectedFile = fileInput.value?.files?.[0]
    if ( !selectedFile ) return

    const name = selectedFile.name.toLowerCase()
    if ( name.endsWith( ".pdf" ) ) fileType.value = "pdf"
    else if ( name.endsWith( ".xlsx" ) ) fileType.value = "xlsx"
    else {
      detectionError.value = "Unsupported file type. Please upload PDF or XLSX."
      fileInput.value.value = ""
      return
    }

    file.value = selectedFile
    fileTypeFilter.value = fileType.value
    selectedLayoutId.value = null
    previewLayoutId.value = null
    detection.value = null
    parseError.value = ""
    await detectFile()
  }

  async function confirmLayout( id: string ) {
    const layout = layouts.find( candidate => candidate.id === id )
    if ( !layout || layout.fileType !== fileType.value ) return

    selectedLayoutId.value = id
    previewLayoutId.value = id

    if ( detection.value?.detectedYear ) selections.value.year = detection.value.detectedYear
    if ( layout.defaultCourse ) selections.value.course = layout.defaultCourse
    if ( layout.areaCode ) {
      selections.value.scope = layout.areaCode === "L" ? "regional" : "county"
      await nextTick()
      selections.value.area = layout.areaCode
    }
  }

  function changeLayout() {
    selectedLayoutId.value = null
    previewLayoutId.value = detection.value?.suggestedLayoutId ?? previewLayoutId.value
  }

  function resetUpload() {
    file.value = null
    fileType.value = ""
    fileTypeFilter.value = "all"
    selectedLayoutId.value = null
    previewLayoutId.value = null
    detection.value = null
    detectionError.value = ""
    parseError.value = ""
    searchLayouts.value = ""
    yearFilter.value = "all"
    areaFilter.value = "all"
    onlyCompatible.value = false
    if ( fileInput.value ) fileInput.value.value = ""
  }

  async function sendFile() {
    if ( !file.value || !selectedLayout.value || parsing.value ) return
    parsing.value = true
    parseError.value = ""

    try {
      const formData = new FormData()
      formData.append( "pdf_file", file.value )
      formData.append( "layout", selectedLayout.value.id )

      const response = await $fetch<{ structured: unknown[] }>( "/api/import", {
        method: "POST",
        body: formData
      } )

      sessionStorage.setItem( "parsedData", JSON.stringify( {
        structured: response.structured,
        selections: selections.value,
        layout: {
          id: selectedLayout.value.id,
          name: selectedLayout.value.name,
          shortName: selectedLayout.value.shortName,
        },
        sourceFileName: file.value.name,
        detectedYear: detection.value?.detectedYear ?? null,
      } ) )
      await router.push( "/parsed" )
    } catch ( error ) {
      parseError.value = ( error as Error )?.message || "Unable to parse this file with the selected layout."
    } finally {
      parsing.value = false
    }
  }
</script>

<template>
  <StandardPage title="Import qualifying times">
    <template #description>
      Upload a PDF or XLSX, confirm the detected layout, review the details and save the qualifying times.
    </template>

    <ImportSteps :current="currentStep" />

    <section
      v-if="!file"
      class="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center"
    >
      <h2 class="text-xl font-semibold text-gray-900">
        Select a qualifying-times document
      </h2>
      <p class="mt-2 text-sm text-gray-600">
        Supported file types: PDF and XLSX
      </p>
      <button
        class="mt-6 rounded-md bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        @click="fileInput?.click()"
      >
        Choose file
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        class="hidden"
        @change="handleFileUpload"
      >
    </section>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Selected file
          </p>
          <p class="font-semibold text-gray-900">
            {{ file.name }}
          </p>
        </div>
        <button
          class="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
          @click="resetUpload"
        >
          Change file
        </button>
      </div>

      <section v-if="!selectedLayout">
        <div
          v-if="detecting"
          class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800"
        >
          Analysing the document and looking for a compatible layout…
        </div>

        <div
          v-else-if="suggestedLayout"
          class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-green-300 bg-green-50 p-4"
        >
          <div>
            <p class="font-semibold text-green-900">
              Layout detected: {{ suggestedLayout.name }} {{ detection?.detectedYear ?? '' }}
            </p>
            <p class="mt-1 text-sm text-green-800">
              Confidence: {{ confidenceLabel }}. Confirm this suggestion or choose another layout below.
            </p>
          </div>
          <button
            class="rounded-md bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
            @click="confirmLayout(suggestedLayout.id)"
          >
            Use suggested layout
          </button>
        </div>

        <div
          v-else-if="!detecting"
          class="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900"
        >
          Automatic detection did not find a confident match. Choose a layout manually.
          <span v-if="detectionError" class="block text-sm">{{ detectionError }}</span>
        </div>

        <div class="mb-5 grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-5">
          <label class="md:col-span-2">
            <span class="text-sm font-medium text-gray-700">Search layouts</span>
            <input
              v-model="searchLayouts"
              type="search"
              placeholder="County, region or layout name"
              class="mt-1 block w-full rounded-md border-gray-300 text-sm"
            >
          </label>
          <label>
            <span class="text-sm font-medium text-gray-700">Year</span>
            <select v-model="yearFilter" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
              <option value="all">All years</option>
              <option v-for="year in catalogYears" :key="year" :value="year">{{ year }}</option>
            </select>
          </label>
          <label>
            <span class="text-sm font-medium text-gray-700">Area</span>
            <select v-model="areaFilter" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
              <option value="all">All areas</option>
              <option v-for="area in catalogAreas" :key="area[0]" :value="area[0]">{{ area[1] }}</option>
            </select>
          </label>
          <label>
            <span class="text-sm font-medium text-gray-700">File type</span>
            <select v-model="fileTypeFilter" class="mt-1 block w-full rounded-md border-gray-300 text-sm">
              <option value="all">All types</option>
              <option value="pdf">PDF</option>
              <option value="xlsx">XLSX</option>
            </select>
          </label>
          <label class="flex items-center gap-2 md:col-span-5">
            <input
              v-model="onlyCompatible"
              type="checkbox"
              :disabled="!detection?.compatibleLayoutIds.length"
              class="rounded border-gray-300 text-blue-600"
            >
            <span class="text-sm text-gray-700">Only compatible layouts</span>
          </label>
        </div>

        <div v-if="filteredLayouts.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="layoutOption in filteredLayouts"
            :key="layoutOption.id"
            :class="[
              'rounded-xl border-2 bg-white p-4 transition',
              previewLayoutId === layoutOption.id ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-blue-300',
              layoutOption.fileType !== fileType ? 'opacity-50' : ''
            ]"
          >
            <button
              type="button"
              class="w-full text-left"
              :aria-label="`Preview ${layoutOption.name}`"
              @click="previewLayoutId = layoutOption.id"
            >
              <div class="mb-3 grid h-20 grid-cols-6 gap-1 rounded-md bg-gray-100 p-2" aria-hidden="true">
                <span v-for="cell in 18" :key="cell" :class="cell % 6 === 0 ? 'bg-blue-200' : 'bg-white border border-gray-200'" />
              </div>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="font-semibold text-gray-900">{{ layoutOption.name }}</h3>
                  <p class="mt-1 text-sm text-gray-500">{{ layoutOption.description }}</p>
                </div>
                <span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold uppercase text-blue-800">
                  {{ layoutOption.fileType }}
                </span>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="year in layoutOption.supportedYears"
                  :key="year"
                  class="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                >
                  {{ year }}
                </span>
                <span
                  v-if="layoutOption.id === detection?.suggestedLayoutId"
                  class="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800"
                >
                  Recommended
                </span>
              </div>
            </button>
            <button
              class="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              :disabled="layoutOption.fileType !== fileType"
              @click="confirmLayout(layoutOption.id)"
            >
              Use {{ layoutOption.shortName }} layout
            </button>
          </article>
        </div>
        <p v-else class="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
          No layouts match these filters. Clear a filter or disable “Only compatible layouts”.
        </p>

        <section v-if="previewLayout" class="mt-8 rounded-xl border border-gray-200 bg-white p-5">
          <div class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Layout preview
              </p>
              <h2 class="text-xl font-bold text-gray-900">
                {{ previewLayout.id.replace('layout', 'Layout ') }} — {{ previewLayout.name }}
              </h2>
            </div>
            <button
              class="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
              :disabled="previewLayout.fileType !== fileType"
              @click="confirmLayout(previewLayout.id)"
            >
              Use this layout
            </button>
          </div>
          <div class="max-h-[34rem] overflow-auto">
            <component :is="previewLayout.component" />
          </div>
        </section>
      </section>

      <section v-else class="rounded-xl border border-gray-200 bg-white p-6">
        <div class="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-wide text-blue-600">Selected layout</p>
            <h2 class="text-2xl font-bold text-gray-900">
              {{ selectedLayout.id.replace('layout', 'Layout ') }} — {{ selectedLayout.name }}
            </h2>
          </div>
          <button class="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-300" @click="changeLayout">
            Change layout
          </button>
        </div>

        <div
          v-if="yearMismatch"
          class="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900"
        >
          The document appears to be for {{ detection?.detectedYear }}, but the selected import year is {{ selections.year }}.
        </div>

        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <UI-Listbox v-model="selections.year" :options="years" label="Year" placeholder="Choose Year" />
          <UI-Listbox v-model="selections.scope" :options="scopes" label="Scope" placeholder="Choose Scope" />
          <UI-Listbox v-model="selections.area" :options="areas" label="Area" placeholder="Choose Area" />
          <UI-Listbox
            v-if="selections.scope === 'regional'"
            v-model="selections.type"
            :options="regionalTypes"
            label="Type"
            placeholder="Choose Type"
          />
          <UI-Listbox v-model="selections.course" :options="courses" label="Course" placeholder="Choose Course" />
        </div>

        <div
          v-if="selections.scope === 'county' || selections.scope === 'regional'"
          class="mt-6 grid gap-5 md:grid-cols-3"
        >
          <div>
            <UI-Input v-model="selections.qualifyingStart" label="Qualifying Start Date" type="date" required />
            <p class="mt-2 text-xs text-gray-500">Earliest date when a qualifying swim is accepted.</p>
          </div>
          <div>
            <UI-Input v-model="selections.qualifyingEnd" label="Qualifying End Date" type="date" />
            <p class="mt-2 text-xs text-gray-500">Final date for achieving a qualifying time.</p>
          </div>
          <div>
            <UI-Input v-model="selections.lastRaceDate" label="Last Race Date" type="date" />
            <p class="mt-2 text-xs text-gray-500">Final competition date covered by these qualification rules.</p>
          </div>
        </div>

        <div
          v-if="detection?.dates.qualifyingStart || detection?.dates.qualifyingEnd || detection?.dates.lastRaceDate"
          class="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
        >
          Dates found in the document were filled automatically. Please confirm them before continuing.
        </div>

        <p v-if="parseError" class="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ parseError }}</p>

        <div class="mt-7 flex justify-end">
          <button
            :disabled="parsing || !selections.year || !selections.scope || !selections.area || !selections.course || (selections.scope !== 'national' && !selections.qualifyingStart)"
            class="rounded-md bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            @click="sendFile"
          >
            {{ parsing ? 'Parsing document…' : 'Parse & review' }}
          </button>
        </div>
      </section>
    </template>
  </StandardPage>
</template>
