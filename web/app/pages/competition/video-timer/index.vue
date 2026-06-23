<script setup lang="ts">
  import { COURSES, strokes } from "lib"
  import type { VideoTimerDraft, VideoTimerMarkerRecord, CourseType, DistanceType, StrokeType } from "lib"
  import UIResultListbox from "~/components/ResultListbox.vue"

  import VideoTimerReviewStep from "~/components/VideoTimerReviewStep.vue"
  import VideoTimerTimingStep from "~/components/VideoTimerTimingStep.vue"

  definePageMeta( {
    layout: "secure",
    fullBleed: true,
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Video Timer",
    meta: [ { name: "description", content: "Upload a video and record swimmer timings while it plays" } ],
  } )

  const route = useRoute()
  const router = useRouter()

  const meetHint = ref<string | null>( null )
  const resultDate = ref<string | null>( null )

  const resultSwimmer = ref<string | null>( null )
  const resultCourse = ref<string | null>( null )
  const resultStroke = ref<string | null>( null )
  const resultDistance = ref<string | null>( null )
  const resultSeq = ref<string | null>( null )

  const resultLink = computed( () => ( {
    resultSwimmer: resultSwimmer.value,
    resultCourse: resultCourse.value,
    resultStroke: resultStroke.value,
    resultDistance: resultDistance.value,
    resultSeq: resultSeq.value,
    resultDate: resultDate.value,
  } ) )



  const selectedResultValue = ref<string | null>( null )

  const serializeResultValue = ( payload: {
    swimmer: string
    course: string
    stroke: string
    distance: string
    seq: string | number
    date: string
    meet: string
  } ) =>
    JSON.stringify( {
      swimmer: payload.swimmer,
      course: payload.course,
      stroke: payload.stroke,
      distance: payload.distance,
      seq: Number( payload.seq ),
      date: payload.date,
      meet: payload.meet,
    } )

  const { showNav } = useLayoutUi()

  const previewIsPortrait = ref( false )

  const onPreviewLoadedMetadata = ( e: Event ) => {
    const v = e.target as HTMLVideoElement
    previewIsPortrait.value = v.videoHeight > v.videoWidth
  }

  type Mode = "setup" | "uploading" | "ready"
  type Step = "setup" | "timing" | "review"

  type UploadVideoResponse = {
    id?: string
    playbackUrl?: string
    statusMessage?: string
    message?: string
  }

  type UploadedVideo = {
    id?: string
    playbackUrl: string
    originalName: string
    mimeType: string
    size: number
    durationMs?: number
  }

  type LibraryVideoResponse = {
    id: string
    playbackUrl: string
    originalName: string
    mimeType: string
    size: number
    durationMs?: number | null
    sessionId?: string | null
    compressionStatusId?: number | null
    compressionStatusCode?: string | null
    compressionStatusName?: string | null
    isCompressionReady?: boolean
  }

  const createEmptyDraft = (): VideoTimerDraft => ( {
    finishVideoMs: null,
    startOffsetMs: null,
    surfaceSlots: [],
    splitSlots: [],
    strokeCountSlots: [],
    breathCountSlots: [],
    breathMarkers: [],
    turns: [],
    selectedSlotId: null,
    markers: [],
    breakoutStartM: 10,
    breakoutTurnM: null,
  } )

  const step = ref<Step>( "setup" )
  const draft = ref<VideoTimerDraft>( createEmptyDraft() )

  const canProceed = computed( () =>
    uploadReady.value &&
    !!selections.course &&
    !!selections.stroke &&
    !!selections.distance &&
    !!resultOfficialFinishTime.value.trim()
  )

  const onContinue = () => {
    draft.value.markers = []
    if ( !canProceed.value ) return
    if ( mode.value === "uploading" || isHydratingLibraryVideo.value ) return
    step.value = "timing"
  }

  const onBackFromTiming = () => {
    step.value = "setup"
  }

  const onBackFromReview = () => {
    step.value = "timing"
  }

  const onStopTiming = ( payload: { markers: VideoTimerMarkerRecord[] } ) => {
    draft.value.markers = payload.markers
    step.value = "review"
  }

  const onSavedSession = () => {
    step.value = "setup"
    void resetVideo()
    draft.value = createEmptyDraft()
  }

  const { swimmer } = useSwimmer()

  const strokeOptions = Object.entries( strokes ).map( ( [ k, v ] ) => ( { value: k as StrokeType, label: v.label } ) )
  const courseOptions = Object.entries( COURSES ).map( ( [ k, v ] ) => ( { value: k as CourseType, label: v } ) )
  const initialStroke = Object.keys( strokes )[0] as StrokeType
  const distanceOptions = reactive<{ value: DistanceType; label: string }[]>(
    strokes[initialStroke]!.distances.map( ( d ) => ( { value: d as DistanceType, label: d } ) )
  )

  const { state: selections } = usePersisted(
    "video-timer-selection",
    {
      course: courseOptions[0]!.value,
      stroke: strokeOptions[0]!.value,
      distance: distanceOptions[0]!.value,
    },
    "reactive"
  )

  watch(
    () => selections.stroke,
    ( newStroke: StrokeType ) => {
      const ds = strokes[newStroke]?.distances ?? []
      distanceOptions.splice( 0, distanceOptions.length, ...ds.map( ( d ) => ( { value: d as DistanceType, label: d } ) ) )
      if ( !ds.includes( selections.distance ) ) selections.distance = ds[0] as DistanceType
    }
  )

  const notes = ref( "" )
  const mode = ref<Mode>( "setup" )

  const fileInput = ref<HTMLInputElement | null>( null )
  const isDragging = ref( false )

  const selectedFile = ref<File | null>( null )
  const localVideoUrl = ref<string | null>( null )
  const uploadedVideo = ref<UploadedVideo | null>( null )

  const errorMsg = ref<string | null>( null )
  const libraryVideoError = ref<string | null>( null )
  const isHydratingLibraryVideo = ref( false )
  const uploadPercent = ref<number | null>( null )

  const xhrRef = ref<XMLHttpRequest | null>( null )
  const uploadToken = ref( 0 )

  const resultOfficialFinishTime = ref<string>( "" )

  const libraryVideoId = computed( () =>
    typeof route.query.videoId === "string" && route.query.videoId
      ? route.query.videoId
      : null
  )

  const isBlobUrl = ( value: string | null | undefined ) => !!value && value.startsWith( "blob:" )

  const clearLocalPreviewUrl = () => {
    if ( localVideoUrl.value && isBlobUrl( localVideoUrl.value ) ) {
      URL.revokeObjectURL( localVideoUrl.value )
    }
    localVideoUrl.value = null
  }

  onBeforeUnmount( () => {
    showNav()
    clearLocalPreviewUrl()
    if ( xhrRef.value ) xhrRef.value.abort()
  } )

  const formatBytes = ( bytes: number ) => {
    const units = [ "B", "KB", "MB", "GB", "TB" ]
    let v = bytes
    let i = 0
    while ( v >= 1024 && i < units.length - 1 ) {
      v /= 1024
      i++
    }
    return `${v.toFixed( i === 0 ? 0 : 1 )} ${units[i]}`
  }

  watch(
    () => route.query,
    ( q ) => {
      meetHint.value = typeof q.meetHint === "string" && q.meetHint ? q.meetHint : null
      resultDate.value = typeof q.resultDate === "string" && q.resultDate ? q.resultDate : null
      resultOfficialFinishTime.value = typeof q.officialFinishTime === "string" ? q.officialFinishTime : ""

      resultSwimmer.value = typeof q.resultSwimmer === "string" && q.resultSwimmer ? q.resultSwimmer : null
      resultCourse.value = typeof q.course === "string" && q.course ? q.course : null
      resultStroke.value = typeof q.stroke === "string" && q.stroke ? q.stroke : null
      resultDistance.value = typeof q.distance === "string" && q.distance ? q.distance : null
      resultSeq.value = typeof q.resultSeq === "string" && q.resultSeq ? q.resultSeq : null

      if ( resultCourse.value ) {
        selections.course = resultCourse.value as CourseType
      }

      if ( resultStroke.value && strokes[resultStroke.value as StrokeType] ) {
        selections.stroke = resultStroke.value as StrokeType
      }

      if ( resultDistance.value ) {
        selections.distance = resultDistance.value as DistanceType
      }

      if (
        resultSwimmer.value &&
        resultCourse.value &&
        resultStroke.value &&
        resultDistance.value &&
        resultSeq.value &&
        resultDate.value &&
        meetHint.value
      ) {
        selectedResultValue.value = serializeResultValue( {
          swimmer: resultSwimmer.value,
          course: resultCourse.value,
          stroke: resultStroke.value,
          distance: resultDistance.value,
          seq: resultSeq.value,
          date: resultDate.value,
          meet: meetHint.value,
        } )
      } else {
        selectedResultValue.value = null
      }
    },
    { immediate: true }
  )

  watch( selectedResultValue, ( value ) => {
    if ( !value ) {
      meetHint.value = null
      resultDate.value = null
      resultSwimmer.value = null
      resultCourse.value = null
      resultStroke.value = null
      resultDistance.value = null
      resultSeq.value = null
      return
    }

    try {
      const parsed = JSON.parse( value ) as {
        swimmer: string
        course: string
        stroke: string
        distance: string
        seq: number
        date: string
        meet: string
      }

      meetHint.value = parsed.meet
      resultDate.value = parsed.date
      resultSwimmer.value = parsed.swimmer
      resultCourse.value = parsed.course
      resultStroke.value = parsed.stroke
      resultDistance.value = parsed.distance
      resultSeq.value = String( parsed.seq )
    } catch {
      selectedResultValue.value = null
    }
  } )

  const extractDurationMs = ( url: string ) =>
    new Promise<number | undefined>( ( resolve ) => {
      const v = document.createElement( "video" )
      v.preload = "metadata"
      v.src = url
      const done = () => {
        const d = Number.isFinite( v.duration ) ? Math.round( v.duration * 1000 ) : undefined
        resolve( d )
      }
      v.onloadedmetadata = done
      v.onerror = () => resolve( undefined )
    } )

  const loadLibraryVideo = async ( id: string ) => {
    isHydratingLibraryVideo.value = true
    libraryVideoError.value = null
    errorMsg.value = null
    uploadPercent.value = null
    step.value = "setup"
    mode.value = "setup"

    if ( xhrRef.value ) xhrRef.value.abort()
    xhrRef.value = null

    selectedFile.value = null
    if ( fileInput.value ) fileInput.value.value = ""

    clearLocalPreviewUrl()
    uploadedVideo.value = null

    try {
      const video = await $fetch<LibraryVideoResponse>( `/api/competition/video-timer-library/${id}` )

      if ( video.sessionId ) {
        throw new Error( "This video is already linked to a session." )
      }

      if ( !video.isCompressionReady ) {
        throw new Error( "This video is still being processed." )
      }

      uploadedVideo.value = {
        id: video.id,
        playbackUrl: video.playbackUrl,
        originalName: video.originalName,
        mimeType: video.mimeType,
        size: Number( video.size ) || 0,
        durationMs: video.durationMs === null || video.durationMs === undefined ? undefined : Number( video.durationMs ),
      }

      mode.value = "ready"

      if ( uploadedVideo.value.durationMs === undefined ) {
        const durationMs = await extractDurationMs( video.playbackUrl )
        if ( uploadedVideo.value && uploadedVideo.value.id === video.id ) {
          uploadedVideo.value = {
            ...uploadedVideo.value,
            durationMs,
          }
        }
      }
    } catch ( error ) {
      uploadedVideo.value = null
      mode.value = "setup"
      libraryVideoError.value =
        error instanceof Error && error.message
          ? error.message
          : "Unable to load linked video."
    } finally {
      isHydratingLibraryVideo.value = false
    }
  }

  watch(
    libraryVideoId,
    async ( id ) => {
      if ( id ) {
        await loadLibraryVideo( id )
        return
      }

      libraryVideoError.value = null

      if ( !selectedFile.value ) {
        uploadedVideo.value = null
        clearLocalPreviewUrl()
        mode.value = "setup"
      }
    },
    { immediate: true }
  )

  const retryLoadLibraryVideo = async () => {
    if ( !libraryVideoId.value ) return
    await loadLibraryVideo( libraryVideoId.value )
  }

  const openPicker = () => fileInput.value?.click()

  const resetVideo = async () => {
    step.value = "setup"
    if ( xhrRef.value ) xhrRef.value.abort()
    xhrRef.value = null
    uploadPercent.value = null
    errorMsg.value = null
    libraryVideoError.value = null
    selectedFile.value = null
    uploadedVideo.value = null
    clearLocalPreviewUrl()
    if ( fileInput.value ) fileInput.value.value = ""
    mode.value = "setup"
    isHydratingLibraryVideo.value = false

    if ( libraryVideoId.value ) {
      const query = { ...route.query }
      delete query.videoId
      await router.replace( { query } )
    }
  }

  const uploadToServerWithProgress = ( file: File, token: number ) =>
    new Promise<{ ok: true; id: string; playbackUrl: string } | { ok: false; message: string }>( ( resolve ) => {
      const form = new FormData()
      form.append( "video", file )
      form.append( "source", "session" )

      const xhr = new XMLHttpRequest()
      xhrRef.value = xhr

      xhr.open( "POST", "/api/competition/video", true )
      xhr.responseType = "json"

      xhr.upload.onprogress = ( e ) => {
        if ( token !== uploadToken.value ) return
        const total = ( e.total && e.total > 0 ? e.total : file.size ) || 0
        if ( !total ) {
          uploadPercent.value = null
          return
        }
        const pct = Math.round( ( e.loaded / total ) * 100 )
        uploadPercent.value = Math.min( 100, Math.max( 0, pct ) )
      }

      xhr.onload = () => {
        if ( token !== uploadToken.value ) return
        uploadPercent.value = null

        const isOk = xhr.status >= 200 && xhr.status < 300
        const body = ( xhr.response ?? {} ) as UploadVideoResponse

        if ( isOk ) {
          const id = typeof body.id === "string" ? body.id : ""
          const playbackUrl = typeof body.playbackUrl === "string" ? body.playbackUrl : ""
          if ( id && playbackUrl ) {
            resolve( { ok: true, id, playbackUrl } )
            return
          }
          resolve( { ok: false, message: "Upload succeeded but response is missing fields." } )
          return
        }

        const msg =
          ( typeof body.statusMessage === "string" ? body.statusMessage : "" )
          || ( typeof body.message === "string" ? body.message : "" )
          || `Upload failed with status ${xhr.status}${xhr.statusText ? ` (${xhr.statusText})` : ""}`

        resolve( { ok: false, message: msg } )
      }

      xhr.onerror = () => {
        if ( token !== uploadToken.value ) return
        uploadPercent.value = null
        resolve( { ok: false, message: "Network error during upload." } )
      }

      xhr.onabort = () => {
        if ( token !== uploadToken.value ) return
        uploadPercent.value = null
        resolve( { ok: false, message: "Upload canceled." } )
      }

      xhr.send( form )
    } )

  const performUpload = async ( file: File ) => {
    errorMsg.value = null
    libraryVideoError.value = null
    uploadPercent.value = 0
    mode.value = "uploading"

    uploadToken.value += 1
    const token = uploadToken.value

    const result = await uploadToServerWithProgress( file, token )
    if ( token !== uploadToken.value ) return

    if ( result.ok ) {
      if ( !uploadedVideo.value ) return
      uploadedVideo.value = {
        ...uploadedVideo.value,
        id: result.id,
        playbackUrl: result.playbackUrl,
      }
      extractDurationMs( result.playbackUrl ).then( ( d ) => {
        if ( !uploadedVideo.value ) return
        if ( uploadedVideo.value.playbackUrl !== result.playbackUrl ) return
        uploadedVideo.value = { ...uploadedVideo.value, durationMs: d }
      } )
      mode.value = "ready"
      return
    }

    errorMsg.value = result.message
    mode.value = "ready"
  }

  const setFile = async ( file: File ) => {
    step.value = "setup"
    errorMsg.value = null
    libraryVideoError.value = null
    uploadPercent.value = null

    if ( !file.type.startsWith( "video/" ) ) {
      errorMsg.value = "Please select a valid video file."
      return
    }

    if ( libraryVideoId.value ) {
      const query = { ...route.query }
      delete query.videoId
      await router.replace( { query } )
    }

    selectedFile.value = file

    if ( xhrRef.value ) xhrRef.value.abort()
    xhrRef.value = null

    clearLocalPreviewUrl()
    localVideoUrl.value = URL.createObjectURL( file )

    uploadedVideo.value = {
      playbackUrl: localVideoUrl.value,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    }

    extractDurationMs( localVideoUrl.value ).then( ( d ) => {
      if ( !uploadedVideo.value ) return
      if ( uploadedVideo.value.playbackUrl !== localVideoUrl.value ) return
      uploadedVideo.value = { ...uploadedVideo.value, durationMs: d }
    } )

    await performUpload( file )
  }

  const retryUpload = async () => {
    if ( !selectedFile.value ) return
    await performUpload( selectedFile.value )
  }

  const onPick = async ( e: Event ) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if ( !file ) return
    await setFile( file )
  }

  const onDrop = async ( e: DragEvent ) => {
    e.preventDefault()
    isDragging.value = false
    const file = e.dataTransfer?.files?.[0]
    if ( !file ) return
    await setFile( file )
  }

  const continueLabel = computed( () => {
    if ( isHydratingLibraryVideo.value ) return "Loading video…"
    if ( mode.value === "uploading" ) return "Uploading…"
    return "Continue"
  } )

  const uploadReady = computed( () =>
    !isHydratingLibraryVideo.value &&
    mode.value === "ready" &&
    !!uploadedVideo.value?.id &&
    !!uploadedVideo.value?.playbackUrl
  )

  const continueHint = computed( () => {
    if ( isHydratingLibraryVideo.value ) return "The linked library video is still loading."
    if ( libraryVideoError.value ) return libraryVideoError.value
    if ( !uploadedVideo.value ) return "Select a video to enable Continue."
    if ( !resultOfficialFinishTime.value.trim() ) return "Enter the official time to enable Continue."
    if ( mode.value === "uploading" ) return "Continue will be enabled when the upload finishes."
    if ( !uploadReady.value ) return libraryVideoId.value ? "The linked video must load successfully to enable Continue." : "Upload must finish successfully to enable Continue. Retry upload."
    return null
  } )

  const inlineUploadHint = computed( () => {
    if ( isHydratingLibraryVideo.value ) return "Preparing linked video..."
    if ( libraryVideoError.value ) return libraryVideoError.value
    if ( libraryVideoId.value ) {
      if ( !uploadedVideo.value ) return "This linked video must load before you can continue."
      if ( !resultOfficialFinishTime.value.trim() ) return "Continue is locked until official time is entered."
      return null
    }
    if ( mode.value === "uploading" ) return "You can continue only after the upload finishes."
    if ( selectedFile.value && !uploadReady.value ) return "Continue is locked until upload succeeds."
    if ( !resultOfficialFinishTime.value.trim() ) return "Continue is locked until official time is entered."
    return null
  } )

  const uploadStatusText = computed( () => {
    if ( mode.value !== "uploading" ) return null
    if ( uploadPercent.value === null ) return "Uploading / preparing…"
    return `Uploading… ${uploadPercent.value}%`
  } )
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden select-none">
    <template v-if="step === 'setup'">
      <div class="flex-1 overflow-y-auto">
        <div class="flex flex-col items-center px-6 py-6">
          <div class="w-full max-w-5xl">
            <div class="pt-2 sm:pt-0 flex flex-wrap items-end gap-x-3 gap-y-2">
              <SwimmerSelector v-model="swimmer" />

              <div class="w-full sm:w-24">
                <UI-Listbox v-model="selections.course" :options="courseOptions" label="Course" placeholder="Choose Course" />
              </div>

              <div class="w-full sm:w-40">
                <UI-Listbox v-model="selections.stroke" :options="strokeOptions" label="Stroke" placeholder="Choose Stroke" />
              </div>

              <div class="w-full sm:w-24">
                <UI-Listbox v-model="selections.distance" :options="distanceOptions" label="Distance" placeholder="Choose Distance" />
              </div>

              <div class="w-full sm:w-48">
                <VideoTimerOfficialTimeInput v-model="resultOfficialFinishTime" />
              </div>
            </div>
          
              


            
            <UIResultListbox
              v-if="swimmer?.id"
              v-model="selectedResultValue"
              :swimmer-id="swimmer.id"
              :course="selections.course"
              :stroke="selections.stroke"
              :distance="selections.distance"
              label="Result"
              placeholder="Choose result (optional)"
              class="mt-4 w-full"
            />
            
         

            <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div>
                <input ref="fileInput" type="file" accept="video/*" class="hidden" @change="onPick" >

                <div
                  v-if="!libraryVideoId"
                  class="w-full rounded-xl border-2 border-dashed p-6 transition-colors"
                  :class="isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'"
                  @dragenter.prevent="isDragging = true"
                  @dragover.prevent="isDragging = true"
                  @dragleave.prevent="isDragging = false"
                  @drop="onDrop"
                >
                  <div class="flex flex-col gap-3">
                    <div class="text-sm font-semibold text-gray-800">Upload video</div>
                    <div class="text-sm text-gray-600">Drag & drop a video here, or choose a file.</div>

                    <div v-if="continueHint" class="w-full max-w-5xl mx-auto mt-2 text-xs text-gray-500">
                      {{ continueHint }}
                    </div>

                    <div class="flex flex-wrap gap-3 items-center">
                      <button class="h-10 px-4 rounded-md bg-gray-900 text-white active:scale-95 transition-transform" @click="openPicker">
                        Choose video
                      </button>

                      <button
                        v-if="selectedFile || uploadedVideo"
                        class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 active:scale-95 transition-transform"
                        @click="resetVideo"
                      >
                        Remove
                      </button>

                      <button
                        v-if="selectedFile && !uploadReady && mode !== 'uploading'"
                        class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 active:scale-95 transition-transform"
                        @click="retryUpload"
                      >
                        Retry upload
                      </button>

                      <div v-if="uploadStatusText" class="text-sm text-gray-600">
                        {{ uploadStatusText }}
                      </div>

                      <div v-if="inlineUploadHint" class="text-xs text-gray-500">
                        {{ inlineUploadHint }}
                      </div>
                    </div>

                    <div v-if="errorMsg" class="text-sm text-red-600">
                      {{ errorMsg }}
                    </div>

                    <div v-if="selectedFile" class="text-xs text-gray-600 mt-2 space-y-1">
                      <div><span class="font-semibold">File:</span> {{ selectedFile.name }}</div>
                      <div><span class="font-semibold">Type:</span> {{ selectedFile.type }}</div>
                      <div><span class="font-semibold">Size:</span> {{ formatBytes(selectedFile.size) }}</div>
                    </div>
                  </div>
                </div>

                <div v-else class="w-full rounded-xl border border-gray-200 bg-white p-6">
                  <div class="flex flex-col gap-3">
                    <div class="text-sm font-semibold text-gray-800">Selected library video</div>
                    <div class="text-sm text-gray-600">
                      This session will use the video selected from the library.
                    </div>

                    <div v-if="continueHint" class="text-xs text-gray-500">
                      {{ continueHint }}
                    </div>

                    <div v-if="isHydratingLibraryVideo" class="text-sm text-gray-600">
                      Loading linked video...
                    </div>

                    <div v-else-if="libraryVideoError" class="space-y-3">
                      <div class="text-sm text-red-600">
                        {{ libraryVideoError }}
                      </div>

                      <div class="flex flex-wrap gap-3 items-center">
                        <button
                          class="h-10 px-4 rounded-md bg-gray-900 text-white active:scale-95 transition-transform"
                          @click="retryLoadLibraryVideo"
                        >
                          Retry
                        </button>

                        <button
                          class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 active:scale-95 transition-transform"
                          @click="resetVideo"
                        >
                          Remove video
                        </button>
                      </div>
                    </div>

                    <div v-else-if="uploadedVideo" class="space-y-3">
                      <div class="text-xs text-gray-600 space-y-1">
                        <div><span class="font-semibold">File:</span> {{ uploadedVideo.originalName }}</div>
                        <div><span class="font-semibold">Type:</span> {{ uploadedVideo.mimeType }}</div>
                        <div><span class="font-semibold">Size:</span> {{ formatBytes(uploadedVideo.size) }}</div>
                        <div v-if="uploadedVideo.durationMs !== undefined">
                          <span class="font-semibold">Duration:</span> {{ ( uploadedVideo.durationMs / 1000 ).toFixed( 1 ) }}s
                        </div>
                      </div>

                      <div v-if="inlineUploadHint" class="text-xs text-gray-500">
                        {{ inlineUploadHint }}
                      </div>

                      <div class="flex flex-wrap gap-3 items-center">
                        <NuxtLink
                          class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center"
                          to="/competition/video-timer/videos"
                        >
                          Open library
                        </NuxtLink>

                        <button
                          class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 active:scale-95 transition-transform"
                          @click="resetVideo"
                        >
                          Remove video
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-4">
                  <UI-Input v-model="notes" type="textarea" placeholder="Notes" class="text-sm" />
                </div>
              </div>

              <div class="w-full">
                <div class="text-sm font-semibold text-gray-800 mb-2">Preview</div>

                <div class="w-full rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
                  <div v-if="uploadedVideo" class="p-3 text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                    <div><span class="font-semibold">Source:</span> {{ uploadedVideo.id ? "Server" : "Local" }}</div>
                    <div v-if="uploadedVideo.durationMs !== undefined">
                      <span class="font-semibold">Duration:</span> {{ ( uploadedVideo.durationMs / 1000 ).toFixed( 1 ) }}s
                    </div>
                  </div>

                  <div
                    class="bg-black flex items-center justify-center overflow-hidden"
                    :class="previewIsPortrait ? 'h-[70vh] max-h-[520px]' : 'aspect-video max-h-[420px]'"
                  >
                    <video
                      v-if="uploadedVideo"
                      :src="uploadedVideo.playbackUrl"
                      controls
                      playsinline
                      class="object-contain max-w-full max-h-full"
                      :class="previewIsPortrait ? 'h-full w-auto' : 'w-full h-full'"
                      @loadedmetadata="onPreviewLoadedMetadata"
                    />
                    <div v-else class="text-sm text-gray-500">No video selected</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div class="border-t bg-white px-6 py-4">
        <div class="w-full max-w-5xl mx-auto flex gap-3">
          <button
            class="flex-1 h-12 rounded-md bg-green-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            :disabled="!canProceed || mode === 'uploading' || isHydratingLibraryVideo"
            type="button"
            @click="onContinue"
          >
            {{ continueLabel }}
          </button>

          <button class="h-12 px-4 rounded-md bg-gray-200 text-gray-900" type="button" @click="resetVideo">
            Reset
          </button>
        </div>
      </div>
    </template>

    <VideoTimerTimingStep
      v-else-if="step === 'timing'"
      :video="uploadedVideo!"
      :selections="selections"
      :swimmer="swimmer"
      :notes="notes"
      :initial-official-finish-time="resultOfficialFinishTime"
      :result-link="resultLink"
      :draft="draft"
      @back="onBackFromTiming"
      @stop="onStopTiming"
      @update:draft="draft = $event"
    />

    <VideoTimerReviewStep
      v-else-if="step === 'review'"
      v-model:markers="draft.markers"
      :video="uploadedVideo!"
      :selections="selections"
      :swimmer="swimmer"
      :notes="notes"
      :start-offset-ms="draft.startOffsetMs"
      :result-link="resultLink"
      :draft="draft"
      @back="onBackFromReview"
      @saved="onSavedSession"
      @update:draft="draft = $event"
    />
  </div>
</template>
