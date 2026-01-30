<script setup lang="ts">
  import { COURSES, strokes, ucFirst, type CourseType, type DistanceType, type StrokeType, type Swimmer } from "lib"
  import localforage from "localforage"

  definePageMeta( {
    layout: "secure",
    fullBleed: true,
    middleware: [ "protected" ]
  } )

  useHead( {
    title: "Swim Timer",
    meta: [
      { name: "description", content: "Record swimmer timings and race performance" }
    ]
  } )

  const { hideNav, showNav } = useLayoutUi()
  const { enable, disable } = useControlSurface()
  const { initAudio, tap, strong } = useFeedback()

  onBeforeUnmount( () => {
    disable()
    showNav()
  } )

  /* -----------------------------
   * Types
   * ----------------------------- */

  type Mode = "setup" | "running" | "review"

  type TimingSession = {
    swimmerId: Swimmer["id"]
    stroke: StrokeType
    distance: DistanceType
    course: CourseType

    startedAt: number
    stoppedAt?: number

    surfacings: number[]
    splits: number[]

    notes: string
  }

  /* -----------------------------
   * Reactive State
   * ----------------------------- */

  const { swimmer } = useSwimmer()

  const strokeOptions = Object.entries( strokes ).map( ( [ k, v ] ) => ( { value: k as StrokeType, label: v.label } ) )
  const courseOptions = Object.entries( COURSES ).map( ( [ k, v ] ) => ( { value: k as CourseType, label: v } ) )
  const initialStroke = Object.keys( strokes )[0]!
  const distanceOptions = reactive<{ value: DistanceType, label: string }[]>( strokes[initialStroke]!.distances.map( d => ( { value: d as DistanceType, label: d } ) ) )

  // const selections = reactive( {
  const { state: selections } = usePersisted( "timer-selection", {
    course: courseOptions[0]!.value,
    stroke: strokeOptions[0]!.value,
    distance: distanceOptions[0]!.value,
  }, "reactive" )

  const notes = ref( "" )

  const mode = ref<Mode>( "setup" )
  const session = ref<TimingSession | null>( null )

  const displayTime = ref( "0:00.00" )
  let rafId: number | null = null

  const lastSurface = ref<number | null>( null )
  const lastSplit = ref<number | null>( null )

  const surfaceActive = ref( false )
  const splitActive = ref( false )

  /* -----------------------------
   * Helpers
   * ----------------------------- */

  const formatTime = ( ms: number ): string => {
    const totalSeconds = ms / 1000
    const minutes = Math.floor( totalSeconds / 60 )
    const seconds = Math.floor( totalSeconds % 60 )
    const hundredths = Math.floor( ( ms % 1000 ) / 10 )

    return `${minutes}:${seconds.toString().padStart( 2, "0" )}.${hundredths
      .toString()
      .padStart( 2, "0" )}`
  }

  const elapsed = (): number =>
    session.value ? performance.now() - session.value.startedAt : 0

  /* -----------------------------
   * Timing Control
   * ----------------------------- */

  const startSession = (
    swimmerId: string,
    stroke: StrokeType,
    distance: DistanceType,
    course: CourseType,
    notes: string,
  ) => {
    initAudio()
    tap()
    hideNav()
    enable()
    session.value = {
      swimmerId,
      stroke,
      distance,
      course,
      startedAt: performance.now(),
      surfacings: [],
      splits: [],
      notes,
    }
    lastSurface.value = null
    lastSplit.value = null

    mode.value = "running"
    startDisplayLoop()
  }

  const pulse = ( flag: Ref<boolean> ) => {
    flag.value = true
    setTimeout( () => {
      flag.value = false
    }, 120 )
  }

  const recordSurface = () => {
    tap()

    if ( !session.value ) return

    const t = elapsed()
    session.value.surfacings.push( t )
    lastSurface.value = t

    pulse( surfaceActive )
    navigator.vibrate?.( 10 )
  }

  const recordSplit = () => {
    tap()

    if ( !session.value ) return

    const t = elapsed()
    session.value.splits.push( t )
    lastSplit.value = t

    pulse( splitActive )
    navigator.vibrate?.( 10 )
  }

  const stopSession = () => {
    strong()

    if ( !session.value ) return

    session.value.stoppedAt = performance.now()
    stopDisplayLoop()
    mode.value = "review"
  }

  /* -----------------------------
   * Display Loop
   * ----------------------------- */

  const startDisplayLoop = () => {
    const loop = () => {
      displayTime.value = formatTime( elapsed() )
      rafId = requestAnimationFrame( loop )
    }

    loop()
  }

  const stopDisplayLoop = () => {
    if ( rafId !== null ) {
      cancelAnimationFrame( rafId )
      rafId = null
    }
  }

  /* -----------------------------
   * Review Data
   * ----------------------------- */

  const events = computed( () => {
    if ( !session.value ) return []

    return [
      ...session.value.surfacings.map( ( t, i ) => ( {
        type: "Surface",
        index: i + 1,
        time: t,
      } ) ),
      ...session.value.splits.map( ( t, i ) => ( {
        type: "Split",
        index: i + 1,
        time: t,
      } ) ),
    ].sort( ( a, b ) => a.time - b.time )
  } )

  /* -----------------------------
   * Persistence (localForage)
   * ----------------------------- */

  localforage.config( {
    name: "swim-timing",
    storeName: "pending-sessions",
  } )

  const saveOffline = async ( data: TimingSession ) => {
    const plainData = structuredClone( toRaw( data ) )
    localforage.setItem( `session-${Date.now()}`, {
      ...plainData,
      savedAt: Date.now(),
    } )
  }

  const saveSession = async () => {
    if ( !session.value ) return

    try {
      session.value.notes = notes.value
      await $fetch( "/api/timings", {
        method: "POST",
        body: session.value,
        timeout: 3000,
      } )
    } catch {
      await saveOffline( session.value )
    }

    reset()
  }

  /* -----------------------------
   * Reset
   * ----------------------------- */

  const reset = () => {
    session.value = null
    mode.value = "setup"
    displayTime.value = "0:00.00"
    lastSurface.value = null
    lastSplit.value = null
    enable()
    showNav()
  }
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden touch-manipulation select-none">
    <!-- SETUP -->
    <div
      v-if="mode === 'setup'"
      class="flex-1 flex flex-col justify-center items-center px-6 pb-24"
    >
      <div class="hidden sm:block pb-6">
        <p>
          Select a swimmer and event and then press "Go" to begin.
          This page is optimised for mobile use.
        </p>
      </div>
      <div class="gap-x-3 pt-2 sm:pt-0 sm:flex sm:items-center sm:justify-between">
        <SwimmerSelector v-model="swimmer" />
        <div class="min-w-24 mt-2 sm:mt-0">
          <UI-Listbox
            v-model="selections.course"
            :options="courseOptions"
            label="Course"
            placeholder="Choose Course"
          />
        </div>
        <div class="min-w-40 mt-2 sm:mt-0">
          <UI-Listbox
            v-model="selections.stroke"
            :options="strokeOptions"
            label="Stroke"
            placeholder="Choose Stroke"
          />
        </div>
        <div class="min-w-16 mt-2 sm:mt-0">
          <UI-Listbox
            v-model="selections.distance"
            :options="distanceOptions"
            label="Distance"
            placeholder="Choose Distance"
          />
        </div>
      </div>
      <div class="mb-12 sm:flex sm:items-center sm:justify-between">
        <div class="min-w-64 sm:min-w-72 mt-4 sm:mt-4">
          <UI-Input
            v-model="notes"
            type="textarea"
            placeholder="Notes"
            class="text-sm"
          />
        </div>
      </div>

      <button
        class="w-48 aspect-square rounded-full bg-green-600
           text-white text-3xl font-semibold
           flex items-center justify-center
           active:scale-95 transition-transform
           disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        :disabled="!selections.stroke || !selections.distance || !selections.course"
        @click="startSession(swimmer?.id ?? '0', selections.stroke, selections.distance, selections.course, notes )"
      >
        GO
      </button>
    </div>

    <!-- RUNNING -->
    <div
      v-else-if="mode === 'running'"
      class="flex-1 flex flex-col"
    >
      <!-- Timer (top third) -->
      <div class="flex-1 flex items-center justify-center">
        <div class="text-6xl font-mono">
          {{ displayTime }}
        </div>
      </div>

      <!-- Last Recorded Times -->
      <div class="flex justify-around text-sm text-gray-600">
        <div class="text-center">
          <div class="uppercase tracking-wide">Surface</div>
          <div class="font-mono text-xl">
            {{ lastSurface !== null ? formatTime(lastSurface) : "—" }}
          </div>
        </div>

        <div class="text-center">
          <div class="uppercase tracking-wide">Split</div>
          <div class="font-mono text-xl">
            {{ lastSplit !== null ? formatTime(lastSplit) : "—" }}
          </div>
        </div>
      </div>

      <!-- Action Buttons (middle third) -->
      <div class="flex-1 flex items-center justify-around">
        <button
          class="w-36 h-36 rounded-full bg-orange-500 text-white text-3xl
             transition-transform duration-75"
          :class="surfaceActive ? 'scale-90 brightness-125' : ''"
          @click="recordSurface"
        >
          ▲
        </button>

        <button
          class="w-36 h-36 rounded-full bg-orange-500 text-white text-3xl
             transition-transform duration-75"
          :class="splitActive ? 'scale-90 brightness-125' : ''"
          @click="recordSplit"
        >
          ▶
        </button>
      </div>

      <!-- Stop Button (bottom fixed area) -->
      <div class="px-6 pb-6">
        <button
          class="w-full h-24 bg-red-600 text-white text-2xl rounded-md"
          @click="stopSession"
        >
          STOP
        </button>
      </div>
    </div>

    <!-- REVIEW -->
    <div
      v-else
      class="flex-1 flex flex-col px-4 py-4"
    >
      <div class="flex-1 overflow-auto">
        <p class="text-lg text-bold pb-2">{{ swimmer ? swimmer.fullName : "Unknown Swimmer" }}</p>
        <p class="text-lg pb-2 mb-2 border-b border-gray-400">{{ selections.distance }} {{ selections.stroke.split( "_" ).map( ( word: string ) => ucFirst( word ) ).join( " " ) }} ({{ COURSES[selections.course] }})</p>
        <table class="w-full text-left">
          <tr v-for="e in events" :key="`${e.type}-${e.index}`">
            <td>{{ e.type }} {{ e.index }}</td>
            <td class="text-right font-mono">
              {{ formatTime(e.time) }}
            </td>
          </tr>
        </table>
        <UI-Input
          v-model="notes"
          type="textarea"
          class="mt-4 min-h-24 text-sm"
        />
      </div>

      <div class="flex gap-4 pt-4">
        <button
          class="flex-1 h-14 bg-green-600 text-white"
          @click="saveSession"
        >
          Save
        </button>

        <button
          class="flex-1 h-14 bg-gray-400 text-white"
          @click="reset"
        >
          Discard
        </button>
      </div>
    </div>

  </div>
</template>
