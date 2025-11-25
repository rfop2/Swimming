<script setup lang="ts">
  import { ref, computed, onMounted } from "vue"
  import { timeToSeconds, COUNTIES, REGIONS, NATIONALITIES } from "lib"

  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ]
  } )

  type Course = "lc" | "sc" | "both"
  type Gender = "Male" | "Female"
  type QualifyingType = "general" | "summer" | "winter"

  interface Selections {
    year: number | string
    scope: string // "county" | "regional" | "national"
    area: string // ex: "DVNW"
    course: Course // "lc" | "sc" | "both"
    type: QualifyingType
    qualifyingStart?: string
    qualifyingEnd?: string | null
    eligibilityStart?: string | null
    eligibilityEnd?: string | null
  }

  interface QualifyingPeriod {
    qualifyingStart: string
    qualifyingEnd: string | null
    eligibilityStart: string | null
    eligibilityEnd: string | null
  }

  interface StructuredRow {
    gender: string
    course?: string | null
    event: string
    distance: string
    stroke: string
    age: string
    time?: string | null
  }

  interface ImportRow {
    created: Date
    year: number | string
    course: Course | null
    scope: string
    area: string
    gender: string
    age: string
    distance: string
    stroke: string
    timeString: string
    time: number
    type: QualifyingType
  }

  const structuredData = ref<StructuredRow[]>( [] )
  const selections = ref<Selections | null>( null )

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
      const parsed = JSON.parse( stored ) as { structured: StructuredRow[], selections: Selections }
      structuredData.value = parsed.structured ?? []
      selections.value = parsed.selections ?? null
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
    if ( t === "summer" ) return "Summer"
    if ( t === "winter" ) return "Winter"
    return "General"
  } )

  const period = computed<QualifyingPeriod>( () => {
    const s = selections.value
    if ( !s ) {
      return {
        qualifyingStart: "",
        qualifyingEnd: null,
        eligibilityStart: null,
        eligibilityEnd: null,
      }
    }
    return {
      qualifyingStart: s.qualifyingStart || "",
      qualifyingEnd: s.qualifyingEnd || null,
      eligibilityStart: s.eligibilityStart || null,
      eligibilityEnd: s.eligibilityEnd || null,
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

  function normalizeStroke( stroke: string ) {
    switch ( stroke.toLowerCase() ) {
      case "backstroke": return "backstroke"
      case "breaststroke": return "breaststroke"
      case "butterfly": return "butterfly"
      case "freestyle": return "freestyle"
      case "im":
      case "medley":
      case "individual medley":
        return "individual_medley"
      default:
        return stroke.toLowerCase()
    }
  }

  function resolveCourseForRow( item: StructuredRow, sel: Selections | null ): Course | null {
    const choose = ( v: string | null | undefined ): Course | null =>
      v === "lc" || v === "sc" ? v : null

    const fromRow = choose( item.course ?? undefined )
    if ( fromRow ) return fromRow

    if ( !sel ) return null

    if ( sel.course === "both" ) {
      return item.course === "sc" ? "sc" : "lc"
    }

    return choose( sel.course )
  }

  function mapToImportRows( structured: StructuredRow[], sel: Selections | null ): ImportRow[] {
    const created = new Date()
    const year = sel?.year ?? ""
    const scope = sel?.scope ?? ""
    const area = sel?.area ?? ""
    const qtype: QualifyingType = sel?.type ?? "general"

    return structured.map( item => {
      const course = resolveCourseForRow( item, sel )
      const timeString = item.time || "00:00.00"
      const time = item.time ? timeToSeconds( item.time ) : 0.0

      return {
        created,
        year,
        course,
        scope,
        area,
        gender: item.gender,
        age: item.age,
        distance: item.distance,
        stroke: normalizeStroke( item.stroke ),
        timeString,
        time,
        type: qtype
      }
    } )
  }

  function looksLikeTime( s: string ) {
    return /^(?:\d{1,2}(?:\.\d{1,3})?|\d{1,2}:\d{2}(?:\.\d{1,3})?|\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)$/.test( s )
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

    try {
      const rows = mapToImportRows( structuredData.value, selections.value )

      if (
        selections.value &&
        ( selections.value.scope === "county" || selections.value.scope === "regional" )
      ) {
        const periodPayload = [ {
          year: Number( selections.value.year ),
          scope: selections.value.scope,
          area: selections.value.area,
          type: selections.value.type,
          qualifyingStart: period.value.qualifyingStart || null,
          qualifyingEnd: period.value.qualifyingEnd || null,
          eligibilityStart: period.value.eligibilityStart || null,
          eligibilityEnd: period.value.eligibilityEnd || null,
        } ]

        await $fetch( "/api/qualifying/dates", {
          method: "PUT",
          body: JSON.stringify( periodPayload ),
        } )
      }

      await $fetch( "/api/import", { method: "PUT", body: rows } )
      saveSuccess.value = true
      await refreshNuxtData( "import" )
    } catch ( error ) {
      errorText.value = ( error as Error )?.message || "Import failed."
      errorVisible.value = true
    }
  }

</script>

<template>
  <StandardPage title="Parsed Results - Please Verify Time Values">
    <div class="h-screen flex flex-col">
      <div
        v-if="!structuredData.length"
        class="text-center text-gray-500"
      >
        No data available. Please upload a file first.
      </div>

      <div v-else>
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
          <span>
            Eligibility:
            <strong>{{ period.eligibilityStart || "—" }}</strong>
            <template v-if="period.eligibilityEnd">
              – <strong>{{ period.eligibilityEnd }}</strong>
            </template>
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
        <div class="space-x-4 mb-6">
          <button
            class="bg-green-600 text-white px-4 py-2 rounded font-semibold ml-auto"
            @click="save"
          >
            Save to Database
          </button>
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
                :class="idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'"
              >
                <td class="border border-gray-300 px-4 py-2">
                  {{ e.age }}
                </td>
                <td class="border border-gray-300 px-4 py-2">
                  <div v-if="!editingTime[`${idx}_${e.age}`]">
                    {{ e.time ?? '—' }}
                    <button
                      class="ml-2 text-blue-600"
                      @click="editingTime[`${idx}_${e.age}`] = true"
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
                      @keyup.enter="editingTime[`${idx}_${e.age}`] = false"
                    >
                    <button
                      class="text-gray-500 px-2"
                      @click="editingTime[`${idx}_${e.age}`] = false"
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
      title="Successfully saved!"
      text="Data imported."
    />
    <UI-ErrorNotification
      v-model="errorVisible"
      title="Validation failed"
      :text="errorText"
    />
  </StandardPage>
</template>
