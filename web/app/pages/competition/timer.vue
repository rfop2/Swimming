<script setup lang="ts">
  import type { CourseType, DistanceType, StrokeType, Swimmer } from "lib"
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
  }

  /* -----------------------------
   * Reactive State
   * ----------------------------- */

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
    storeName: "pending_sessions",
  } )

  const saveOffline = async ( data: TimingSession ) =>
    localforage.setItem( `session-${Date.now()}`, {
      ...data,
      savedAt: Date.now(),
    } )

  const saveSession = async () => {
    if ( !session.value ) return

    try {
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
      class="flex-1 flex flex-col justify-center items-center px-6"
    >
      <!-- Your dropdowns go above if needed -->

      <button
        class="w-48 aspect-square rounded-full bg-green-600
           text-white text-3xl font-semibold
           flex items-center justify-center
           active:scale-95 transition-transform"
        @click="startSession('swimmer1', 'freestyle', '50m', 'sc')"
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
          class="w-32 h-32 rounded-full bg-orange-500 text-white text-3xl
             transition-transform duration-75"
          :class="surfaceActive ? 'scale-90 brightness-125' : ''"
          @click="recordSurface"
        >
          ▲
        </button>

        <button
          class="w-32 h-32 rounded-full bg-orange-500 text-white text-3xl
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
        <table class="w-full text-left">
          <tr v-for="e in events" :key="`${e.type}-${e.index}`">
            <td>{{ e.type }} {{ e.index }}</td>
            <td class="text-right font-mono">
              {{ formatTime(e.time) }}
            </td>
          </tr>
        </table>
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
