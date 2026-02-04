<script setup lang="ts">
  import { COURSES, strokes, type CourseType, type DistanceType, type StrokeType } from "lib"
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

  const { showNav } = useLayoutUi()

  const previewIsPortrait = ref( false )

  const onPreviewLoadedMetadata = ( e: Event ) => {
    const v = e.target as HTMLVideoElement
    previewIsPortrait.value = v.videoHeight > v.videoWidth
  }

  type Mode = "setup" | "uploading" | "ready"
  type Step = "setup" | "timing" | "review"
  type Marker = { id: string; type: "surfacing" | "split"; tMs: number }

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

  type MeetOption = { value: string | null; label: string }

  

  const step = ref<Step>( "setup" )
  const markers = ref<Marker[]>( [] )
  const onContinue = () => {
    markers.value = []
    if ( !canProceed.value ) return
    if ( mode.value === "uploading" ) return
    step.value = "timing"
  }

  const onBackFromTiming = () => {
    step.value = "setup"
  }


  const onBackFromReview = () => {
    step.value = "timing"
  }


  const onStopTiming = ( payload: { markers: Marker[] } ) => {
    markers.value = payload.markers
    step.value = "review"
  }
  const onSavedSession = () => {
    step.value = "setup"
    resetVideo()
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

  const meetSearch = ref( "" )
  const debouncedMeetSearch = ref( "" )
  let meetSearchT: ReturnType<typeof setTimeout> | null = null

  watch( meetSearch, ( v ) => {
    if ( meetSearchT ) clearTimeout( meetSearchT )
    meetSearchT = setTimeout( () => {
      debouncedMeetSearch.value = v
    }, 250 )
  } )

  const { data: meets } = await useAsyncData(
    () => `video-timer-meets-${selections.course}-${debouncedMeetSearch.value}`,
    () =>
      $fetch<Array<{ id: string; name: string; date: string; course: string; location: string | null; code: string }>>(
        "/api/competition/meets-video-timer-sessions",
        {
          query: {
            course: selections.course,
            q: debouncedMeetSearch.value || undefined,
          },
        }
      ),
    { default: () => [] }
  )

  const meetOptions = computed<MeetOption[]>( () => {
    const list = meets.value ?? []
    return [
      { value: null, label: "No meet (optional)" },
      ...list.map( ( m ) => ( {
        value: m.id,
        label: m.name,
      } ) ),
    ]
  } )

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
  const uploadPercent = ref<number | null>( null )

  const xhrRef = ref<XMLHttpRequest | null>( null )
  const uploadToken = ref( 0 )

  onBeforeUnmount( () => {
    showNav()
    if ( localVideoUrl.value ) URL.revokeObjectURL( localVideoUrl.value )
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

  const openPicker = () => fileInput.value?.click()

  const resetVideo = () => {
    markers.value = []
    step.value = "setup"
    if ( xhrRef.value ) xhrRef.value.abort()
    xhrRef.value = null
    uploadPercent.value = null
    errorMsg.value = null

    selectedFile.value = null
    uploadedVideo.value = null

    if ( localVideoUrl.value ) {
      URL.revokeObjectURL( localVideoUrl.value )
      localVideoUrl.value = null
    }

    if ( fileInput.value ) fileInput.value.value = ""
    mode.value = "setup"
  }

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

  const uploadToServerWithProgress = ( file: File, token: number ) =>
    new Promise<{ ok: true; id: string; playbackUrl: string } | { ok: false; message: string }>( ( resolve ) => {
      const form = new FormData()
      form.append( "video", file )

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

        const msgFromBody =
          ( typeof body.statusMessage === "string" ? body.statusMessage : "" )
          || ( typeof body.message === "string" ? body.message : "" )

        const msg =
          msgFromBody
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
    markers.value = []
    step.value = "setup"
    errorMsg.value = null
    uploadPercent.value = null

    if ( !file.type.startsWith( "video/" ) ) {
      errorMsg.value = "Please select a valid video file."
      return
    }

    selectedFile.value = file

    if ( xhrRef.value ) xhrRef.value.abort()
    xhrRef.value = null

    if ( localVideoUrl.value ) URL.revokeObjectURL( localVideoUrl.value )
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
  const continueLabel = computed( () => ( mode.value === "uploading" ? "Uploading…" : "Continue" ) )
  const continueHint = computed( () => {
    if ( !selectedFile.value ) return "The video needs to finish uploading to enable button Continue."
    if ( mode.value === "uploading" ) return "Continue will be enabled when the upload finishes."
    if ( !uploadReady.value ) return "Upload must finish successfully to enable Continue. Retry upload."
    return null
  } )
  const inlineUploadHint = computed( () => {
    if ( mode.value === "uploading" ) return "You can continue only after the upload finishes."
    if ( selectedFile.value && !uploadReady.value ) return "Continue is locked until upload succeeds."
    return null
  } )
  const uploadReady = computed( () => mode.value === "ready" && !!uploadedVideo.value?.id && !!uploadedVideo.value?.playbackUrl )
  const canProceed = computed( () => uploadReady.value && !!selections.course && !!selections.stroke && !!selections.distance )

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

              <div class="w-full sm:w-56">
                <div class="text-xs font-medium text-gray-700 mb-1">Meet search</div>
                <UI-Input v-model="meetSearch" placeholder="Search meet (optional)" class="w-full" />
              </div>

              <div class="w-full sm:w-56">
                <UI-Listbox v-model="meetId" :options="meetOptions" label="Meet" placeholder="Choose Meet (optional)" />
              </div>

              <NuxtLink class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center" to="/competition/video-timer/sessions">
                Sessions
              </NuxtLink>
            </div>


            <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div>
                <input ref="fileInput" type="file" accept="video/*" class="hidden" @change="onPick" >

                <div
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
                      <span class="font-semibold">Duration:</span> {{ (uploadedVideo.durationMs / 1000).toFixed(1) }}s
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

                <div class="mt-2 text-xs text-gray-500">
                  Continue will be used to enter the timing mode (GO/play + marker buttons) in the next step.
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
            :disabled="!canProceed || mode === 'uploading'"
            type="button"
            @click="onContinue"
          >
            {{continueLabel}}
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
      :meet-id="meetId"
      :notes="notes"
      @back="onBackFromTiming"
      @stop="onStopTiming"
    />

    <VideoTimerReviewStep
      v-else-if="step === 'review'"
      v-model:markers="markers"
      :video="uploadedVideo!"
      :selections="selections"
      :swimmer="swimmer"
      :meet-id="meetId"
      :notes="notes"
      @back="onBackFromReview"
      @saved="onSavedSession"
    />
   
  </div>
</template>
