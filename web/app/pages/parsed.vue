<script setup lang="ts">
  import { ref, computed, onMounted } from "vue"
  import { COUNTIES, REGIONS, NATIONALITIES } from "lib"
  import type { QualifyingType } from "lib"
  import {
    mapQualifyingImportRows,
    type QualifyingCourse,
    type StructuredQualifyingRow
  } from "../utils/qualifyingImportRows"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  type Course = QualifyingCourse
  type Gender = "Male" | "Female"

  interface Selections {
    year: number | string
    scope: string // "county" | "regional" | "national"
    area: string // ex: "DVNW"
    course: Course // "lc" | "sc" | "both"
    type: QualifyingType
    qualifyingStart?: string
    qualifyingEnd?: string | null
    lastRaceDate?: string | null
  }

  interface QualifyingPeriod {
    qualifyingStart: string
    qualifyingEnd: string | null
    lastRaceDate: string | null
  }

  type StructuredRow = StructuredQualifyingRow

  interface ImportLayoutInfo {
    id: string
    name: string
    shortName: string
  }

  const structuredData = ref<StructuredRow[]>( [] )
  const selections = ref<Selections | null>( null )
  const importLayout = ref<ImportLayoutInfo | null>( null )
  const sourceFileName = ref( "" )
  const detectedYear = ref<number | null>( null )

  const activeGender = ref<Gender>( "Male" )
  const activeStroke = ref<string>( "All" )
  const activeCourse = ref<Course>( "lc" )

  const courses: Array<{ value: Course, label: string }> = [
    { value: "lc", label: "Long Course" },
    { value: "sc", label: "Short Course" }
  ]

  const genders: Gender[] = [ "Male", "Female" ]
  const editingTime = ref<Record<string, boolean>>( {} )
  const errorVisible = ref( false )
  const errorText = ref( "" )
  const saveSuccess = ref( false )
  const importCompleted = ref( false )
  const saving = ref( false )
  const saveStage = ref<"idle" | "dates" | "times" | "complete">( "idle" )
  const saveProgress = ref( 0 )
  const successMessage = ref( "" )

  const sanitizeTime = ( val: string ) =>
    val
      .replace( /[^\d:.]/g, "" )
      .replace( /:{2,}/g, ":" )
      .replace( /\.{2,}/g, "." )
      .slice( 0, 12 )

  const allowedNav = new Set<string>( [
    "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    "Home", "End", "Tab", "Enter", "Escape"
  ] )

  function onTimeKeydown( e: KeyboardEvent ) {
    const k = e.key
    if ( allowedNav.has( k ) ) return
    if ( ( e.ctrlKey || e.metaKey ) && [ "a", "c", "v", "x" ].includes( k.toLowerCase() ) ) return
    if ( /^\d$/.test( k ) || k === ":" || k === "." ) return
    e.preventDefault()
  }

  function onTimeInput( e: Event, modelUpdate: ( v: string ) => void ) {
    const el = e.target as HTMLInputElement
    modelUpdate( sanitizeTime( el.value ) )
  }

  onMounted( () => {
    const stored = sessionStorage.getItem( "parsedData" )
    if ( stored ) {
      const parsed = JSON.parse( stored ) as {
        structured: StructuredRow[]
        selections: Selections
        layout?: ImportLayoutInfo
        sourceFileName?: string
        detectedYear?: number | null
      }
      structuredData.value = parsed.structured ?? []
      selections.value = parsed.selections ?? null
      importLayout.value = parsed.layout ?? null
      sourceFileName.value = parsed.sourceFileName ?? ""
      detectedYear.value = parsed.detectedYear ?? null
    } else {
      console.warn( "No parsedData found in sessionStorage" )
    }
  } )
  const scopeLabel = computed( () => {
    if ( !selections.value ) return ""
    const map: Record<string, string> = {
      county: "County",
      regional: "Regional",
      national: "National"
    }
    return map[selections.value.scope] ?? selections.value.scope
  } )

  const areaLabel = computed( () => {
    const sel = selections.value
    if ( !sel ) return ""
    const { scope, area } = sel

    if ( scope === "county" ) {
      return COUNTIES[area as keyof typeof COUNTIES] ?? area
    }
    if ( scope === "regional" ) {
      return REGIONS[area as keyof typeof REGIONS] ?? area
    }
    if ( scope === "national" ) {
      return NATIONALITIES[area as keyof typeof NATIONALITIES] ?? area
    }
    return area
  } )

  const typeLabel = computed( () => {
    const t: QualifyingType = selections.value?.type ?? "general"
    return t.charAt( 0 ).toUpperCase() + t.slice( 1 )
  } )

  const period = computed<QualifyingPeriod>( () => {
    const s = selections.value
    if ( !s ) {
      return {
        qualifyingStart: "",
        qualifyingEnd: null,
        lastRaceDate: null,
      }
    }
    return {
      qualifyingStart: s.qualifyingStart || "",
      qualifyingEnd: s.qualifyingEnd || null,
      lastRaceDate: s.lastRaceDate || null,
    }
  } )

  const courseLabelDisplay = computed( () => {
    const c = selections.value?.course
    if ( c === "lc" ) return "Long"
    if ( c === "sc" ) return "Short"
    if ( c === "both" ) return "Both"
    return ""
  } )

  const strokes = computed<string[]>( () => {
    const allStrokes = structuredData.value.map( item => item.stroke ).filter( Boolean )
    return [ "All", ...Array.from( new Set( allStrokes ) ) ]
  } )

  const importSummary = computed( () => {
    const total = structuredData.value.length
    const filled = structuredData.value.filter( row => !!row.time?.toString().trim() ).length
    const empty = total - filled
    const invalid = structuredData.value.filter( row => {
      const time = row.time?.toString().trim() ?? ""
      return !!time && !looksLikeTime( time )
    } ).length
    const maleEvents = new Set(
      structuredData.value
        .filter( row => row.gender?.toLowerCase() === "male" )
        .map( row => row.event || `${row.stroke} ${row.distance}` )
    ).size
    const femaleEvents = new Set(
      structuredData.value
        .filter( row => row.gender?.toLowerCase() === "female" )
        .map( row => row.event || `${row.stroke} ${row.distance}` )
    ).size

    const seen = new Set<string>()
    const duplicateKeys = new Set<string>()
    for ( const row of structuredData.value ) {
      const key = rowIdentity( row )
      if ( seen.has( key ) ) duplicateKeys.add( key )
      seen.add( key )
    }

    return { total, filled, empty, invalid, maleEvents, femaleEvents, duplicates: duplicateKeys.size, duplicateKeys }
  } )

  const reviewYearMismatch = computed( () =>
    !!detectedYear.value && Number( selections.value?.year ) !== detectedYear.value
  )

  const currentStep = computed( () => importCompleted.value ? 5 : 4 )

  const saveButtonText = computed( () => {
    if ( saveStage.value === "dates" ) return "Saving qualification dates…"
    if ( saveStage.value === "times" ) return `Saving ${importSummary.value.filled} qualifying times…`
    if ( saveStage.value === "complete" ) return "Saved"
    return "Save to Database"
  } )

  const filteredData = computed<Record<string, StructuredRow[]>>( () => {
    let filtered = structuredData.value
      .filter( item => item.gender?.toLowerCase() === activeGender.value.toLowerCase() )
      .filter( item => activeStroke.value === "All" || item.stroke === activeStroke.value )

    if ( selections.value?.course === "both" ) {
      filtered = filtered.filter( item => item.course === activeCourse.value )
    }

    return filtered.reduce<Record<string, StructuredRow[]>>( ( acc, item ) => {
      const key = item.event || `${item.stroke} ${item.distance}`
      if ( !acc[key] ) acc[key] = []
      acc[key].push( item )
      return acc
    }, {} )
  } )

  function looksLikeTime( s: string ) {
    return /^(?:\d{1,2}(?:\.\d{1,3})?|\d{1,2}:\d{2}(?:\.\d{1,3})?|\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)$/.test( s )
  }

  function rowIdentity( row: StructuredRow ) {
    return [ row.gender, row.course ?? selections.value?.course ?? "", row.stroke, row.distance, row.age ]
      .map( value => value?.toString().trim().toLowerCase() ?? "" )
      .join( ":" )
  }

  function isInvalidTime( row: StructuredRow ) {
    const time = row.time?.toString().trim() ?? ""
    return !!time && !looksLikeTime( time )
  }

  function reviewRowClass( row: StructuredRow, index: number ) {
    if ( isInvalidTime( row ) ) return "bg-red-50"
    if ( importSummary.value.duplicateKeys.has( rowIdentity( row ) ) ) return "bg-orange-50"
    if ( !row.time?.toString().trim() ) return "bg-amber-50"
    return index % 2 === 0 ? "bg-white" : "bg-gray-50"
  }

  function editKey( eventName: string | number, row: StructuredRow, index: number ) {
    return `${eventName}:${row.gender}:${row.age}:${index}`
  }

  function genderLabel( row: StructuredRow ) {
    const g = ( row?.gender ?? "" ).toString().trim().toLowerCase()
    if ( g.startsWith( "f" ) ) return "Female"
    if ( g.startsWith( "m" ) ) return "Male"
    return "Male/Female"
  }

  function courseLabel( row: StructuredRow, sel?: Selections | null ) {
    const v = row?.course ?? ( sel?.course && typeof sel.course !== "string" ? sel.course.value : sel?.course ) ?? ""

    if ( typeof v === "string" ) {
      if ( v.toLowerCase() === "lc" || /long\s*course/i.test( v ) ) return "LC"
      if ( v.toLowerCase() === "sc" || /short\s*course/i.test( v ) ) return "SC"
    }
    return "LC/SC"
  }

  function validateStructuredTimesWithCourse( structured: StructuredRow[], sel?: Selections | null ) {
    const bad: string[] = []

    for ( const row of structured ) {
      const t = ( row.time ?? "" ).toString().trim()
      if ( !t ) continue
      if ( !looksLikeTime( t ) ) {
        const courseTag = courseLabel( row, sel ?? null )
        const genderTag = genderLabel( row )
        const eventLabel = row.event || `${row.stroke} ${row.distance}`
        bad.push( `[${courseTag} • ${genderTag} • ${eventLabel} • ${row.age}] "${t}"` )
      }
    }

    if ( bad.length ) {
      return {
        ok: false as const,
        message: `There ${bad.length === 1 ? "is" : "are"} ${bad.length} invalid time value${bad.length === 1 ? "" : "s"}: ${bad.join( "; " )}`
      }
    }
    return { ok: true as const }
  }

  async function save() {
    if ( saving.value ) return

    const check = validateStructuredTimesWithCourse( structuredData.value, selections.value )
    if ( !check.ok ) {
      errorText.value = check.message
      errorVisible.value = true
      return
    }

    if (
      selections.value &&
      ( selections.value.scope === "county" || selections.value.scope === "regional" ) &&
      !period.value.qualifyingStart
    ) {
      errorText.value = "Please choose a qualifying start date in the import step."
      errorVisible.value = true
      return
    }

    const rows = mapQualifyingImportRows( structuredData.value, selections.value )
    saving.value = true
    saveSuccess.value = false
    importCompleted.value = false
    errorVisible.value = false
    saveProgress.value = 10

    try {

      if (
        selections.value &&
        ( selections.value.scope === "county" || selections.value.scope === "regional" )
      ) {
        saveStage.value = "dates"
        const periodPayload = [ {
          year: Number( selections.value.year ),
          scope: selections.value.scope,
          area: selections.value.area,
          type: selections.value.type,
          qualifyingStart: period.value.qualifyingStart || null,
          qualifyingEnd: period.value.qualifyingEnd || null,
          lastRaceDate: period.value.lastRaceDate || null,
        } ]

        await $fetch( "/api/qualifying/dates", {
          method: "PUT",
          body: JSON.stringify( periodPayload ),
        } )
      }

      saveProgress.value = 45
      saveStage.value = "times"
      await $fetch( "/api/import", { method: "PUT", body: rows } )
      saveProgress.value = 100
      saveStage.value = "complete"
      successMessage.value = `Successfully imported ${rows.length} ${importLayout.value?.shortName ?? ""} qualifying times. ${importSummary.value.empty} empty values skipped.`
      importCompleted.value = true
      saveSuccess.value = true
      await refreshNuxtData( "import" )
    } catch ( error ) {
      const serverMessage = ( error as { data?: { message?: string }, message?: string } )?.data?.message || ( error as Error )?.message
      errorText.value = saveStage.value === "dates"
        ? `Unable to save qualification dates. No qualifying times were saved. ${serverMessage || "Please try again."}`
        : `Qualification dates were saved, but the qualifying times could not be saved. ${serverMessage || "Please try again."}`
      errorVisible.value = true
      saveStage.value = "idle"
      saveProgress.value = 0
    } finally {
      saving.value = false
    }
  }

</script>

<template>
  <StandardPage title="Parsed Results - Please Verify Time Values">
    <ImportSteps :current="currentStep" />

    <div class="flex min-h-screen flex-col">
      <div
        v-if="!structuredData.length"
        class="text-center text-gray-500"
      >
        No data available. Please upload a file first.
      </div>

      <div v-else>
        <div class="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Review before saving
              </p>
              <h2 class="text-xl font-bold text-gray-900">
                {{ importLayout?.name ?? 'Imported qualifying times' }}
              </h2>
              <p v-if="sourceFileName" class="mt-1 text-sm text-gray-500">
                {{ sourceFileName }}
              </p>
            </div>
            <span
              v-if="importLayout"
              class="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800"
            >
              {{ importLayout.id.replace('layout', 'Layout ') }}
            </span>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <div class="rounded-lg bg-gray-50 p-3">
              <p class="text-2xl font-bold text-gray-900">{{ importSummary.total }}</p>
              <p class="text-xs text-gray-500">Records found</p>
            </div>
            <div class="rounded-lg bg-green-50 p-3">
              <p class="text-2xl font-bold text-green-800">{{ importSummary.filled }}</p>
              <p class="text-xs text-green-700">Times filled</p>
            </div>
            <div :class="['rounded-lg p-3', importSummary.empty ? 'bg-amber-50' : 'bg-green-50']">
              <p :class="['text-2xl font-bold', importSummary.empty ? 'text-amber-800' : 'text-green-800']">{{ importSummary.empty }}</p>
              <p class="text-xs text-gray-600">Empty times</p>
            </div>
            <div class="rounded-lg bg-blue-50 p-3">
              <p class="text-2xl font-bold text-blue-800">{{ importSummary.maleEvents }}</p>
              <p class="text-xs text-blue-700">Male events</p>
            </div>
            <div class="rounded-lg bg-pink-50 p-3">
              <p class="text-2xl font-bold text-pink-800">{{ importSummary.femaleEvents }}</p>
              <p class="text-xs text-pink-700">Female events</p>
            </div>
            <div :class="['rounded-lg p-3', importSummary.invalid ? 'bg-red-50' : 'bg-green-50']">
              <p :class="['text-2xl font-bold', importSummary.invalid ? 'text-red-800' : 'text-green-800']">{{ importSummary.invalid }}</p>
              <p class="text-xs text-gray-600">Invalid values</p>
            </div>
            <div :class="['rounded-lg p-3', importSummary.duplicates ? 'bg-orange-50' : 'bg-green-50']">
              <p :class="['text-2xl font-bold', importSummary.duplicates ? 'text-orange-800' : 'text-green-800']">{{ importSummary.duplicates }}</p>
              <p class="text-xs text-gray-600">Duplicate rows</p>
            </div>
          </div>

          <p v-if="!importSummary.invalid && !importSummary.duplicates" class="mt-4 text-sm font-medium text-green-700">
            No invalid values or duplicate rows found.
          </p>
          <p v-if="importSummary.empty" class="mt-2 text-sm text-amber-800">
            Empty times are highlighted in amber. Confirm that they are intentionally blank in the source document.
          </p>
        </div>

        <div
          v-if="reviewYearMismatch"
          class="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900"
        >
          The document appears to be for {{ detectedYear }}, but these times will be imported into {{ selections?.year }}.
        </div>
        <div
          v-if="selections"
          class="text-gray-700 mb-4 flex gap-6"
        >
          <span>Type: <strong>{{ typeLabel }}</strong></span>
          <span>Year: <strong>{{ selections.year }}</strong></span>
          <span>Scope: <strong>{{ scopeLabel }}</strong></span>
          <span>Area: <strong>{{ areaLabel }}</strong></span>
          <span>Course: <strong>{{ courseLabelDisplay }}</strong></span>
        </div>

        <div
          v-if="selections && (selections.scope === 'county' || selections.scope === 'regional')"
          class="text-gray-700 mb-4 flex gap-6"
        >
          <span>
            Qualifying:
            <strong>{{ period.qualifyingStart || "—" }}</strong>
            <template v-if="period.qualifyingEnd">
              – <strong>{{ period.qualifyingEnd }}</strong>
            </template>
          </span>
          <span v-if="period.lastRaceDate">
            Last Race Date: <strong>{{ period.lastRaceDate }}</strong>
          </span>
        </div>

        <div class="flex space-x-4 mb-4">
          <button
            v-for="g in genders"
            :key="g"
            :class="[activeGender === g ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700', 'px-4 py-2 rounded font-semibold']"
            @click="activeGender = g"
          >
            {{ g }}
          </button>
        </div>

        <div class="flex space-x-4 mb-6">
          <button
            v-for="s in strokes"
            :key="s"
            :class="[activeStroke === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700', 'px-4 py-2 rounded font-semibold']"
            @click="activeStroke = s"
          >
            {{ s }}
          </button>
        </div>
        <div
          v-if="selections && selections.course === 'both'"
          class="flex space-x-4 mb-6"
        >
          <button
            v-for="c in courses"
            :key="c.value"
            :class="[activeCourse === c.value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700', 'px-4 py-2 rounded font-semibold']"
            @click="activeCourse = c.value"
          >
            {{ c.label }}
          </button>
        </div>
        <div class="mb-6">
          <button
            :disabled="saving || importCompleted || !!importSummary.invalid || !!importSummary.duplicates"
            class="rounded bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            @click="save"
          >
            {{ saveButtonText }}
          </button>
          <div v-if="saving || saveStage === 'complete'" class="mt-3 max-w-xl">
            <div class="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                class="h-full bg-green-600 transition-all duration-300"
                :style="{ width: `${saveProgress}%` }"
              />
            </div>
            <p class="mt-1 text-sm text-gray-600">{{ saveProgress }}% complete</p>
          </div>
        </div>

        <div
          v-if="importCompleted"
          class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-green-300 bg-green-50 p-5"
        >
          <div>
            <h2 class="font-bold text-green-900">Import complete</h2>
            <p class="mt-1 text-sm text-green-800">{{ successMessage }}</p>
          </div>
          <NuxtLink
            to="/qualifying/times"
            class="rounded-md bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800"
          >
            View imported times
          </NuxtLink>
        </div>

        <div
          v-for="(events, eventName) in filteredData"
          :key="eventName"
          class="mb-8"
        >
          <h2 class="text-lg font-bold mb-2">
            {{ eventName }}
          </h2>
          <table class="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr class="bg-gray-200">
                <th class="border border-gray-300 px-4 py-2 text-left">
                  Age
                </th>
                <th class="border border-gray-300 px-4 py-2 text-left">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(e, idx) in events"
                :key="idx"
                :class="reviewRowClass(e, idx)"
              >
                <td class="border border-gray-300 px-4 py-2">
                  {{ e.age }}
                </td>
                <td class="border border-gray-300 px-4 py-2">
                  <div v-if="!editingTime[editKey(eventName, e, idx)]">
                    {{ e.time ?? '—' }}
                    <button
                      class="ml-2 text-blue-600"
                      @click="editingTime[editKey(eventName, e, idx)] = true"
                    >
                      ✏️
                    </button>
                  </div>
                  <div
                    v-else
                    class="flex items-center gap-2"
                  >
                    <input
                      v-model="e.time"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9:.]*"
                      class="border px-2 py-1 w-20"
                      @keydown="onTimeKeydown"
                      @input="onTimeInput($event, v => e.time = v)"
                      @keyup.enter="editingTime[editKey(eventName, e, idx)] = false"
                    >
                    <button
                      class="text-gray-500 px-2"
                      @click="editingTime[editKey(eventName, e, idx)] = false"
                    >
                      ❌
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <UI-SuccessNotification
      v-model="saveSuccess"
      title="Import complete"
      :text="successMessage"
    />
    <UI-ErrorNotification
      v-model="errorVisible"
      title="Validation failed"
      :text="errorText"
    />
  </StandardPage>
</template>
