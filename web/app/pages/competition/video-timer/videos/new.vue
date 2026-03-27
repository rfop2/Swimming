<script setup lang="ts">
  definePageMeta( {
    layout: "secure",
    middleware: [ "protected" ],
  } )

  useHead( {
    title: "Upload Video",
  } )

  const router = useRouter()

  const selectedFile = ref<File | null>( null )
  const isUploading = ref( false )
  const uploadError = ref( "" )
  const uploadedVideoId = ref( "" )

  const formatBytes = ( bytes: number | null | undefined ) => {
    const value = Number( bytes ?? 0 )

    if ( value < 1024 ) return `${value} B`
    if ( value < 1024 * 1024 ) return `${( value / 1024 ).toFixed( 1 )} KB`
    if ( value < 1024 * 1024 * 1024 ) return `${( value / ( 1024 * 1024 ) ).toFixed( 1 )} MB`

    return `${( value / ( 1024 * 1024 * 1024 ) ).toFixed( 1 )} GB`
  }

  const selectedFileName = computed( () => selectedFile.value?.name ?? "" )
  const selectedFileSize = computed( () => selectedFile.value ? formatBytes( selectedFile.value.size ) : "—" )

  const onFileChange = ( event: Event ) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0] ?? null

    uploadError.value = ""
    selectedFile.value = file
  }

  const uploadVideo = async () => {
    if ( !selectedFile.value || isUploading.value ) return

    uploadError.value = ""
    isUploading.value = true

    try {
      const formData = new FormData()
      formData.append( "source", "library" )
      formData.append( "video", selectedFile.value )

      const result = await $fetch<{ id: string }>( "/api/competition/video", {
        method: "POST",
        body: formData,
      } )

      if ( !result?.id ) {
        throw new Error( "Missing uploaded video id" )
      }

      uploadedVideoId.value = result.id
      await router.push( `/competition/video-timer/videos/${result.id}` )
    } catch ( error ) {
      uploadError.value =
        error instanceof Error && error.message
          ? error.message
          : "Unable to upload video"
    } finally {
      isUploading.value = false
    }
  }
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-5xl mx-auto px-6 py-6">
        <div class="max-w-2xl mx-auto">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-lg font-semibold text-gray-900">Upload video</div>
              <div class="text-xs text-gray-500 mt-1">
                Add a video to the library before creating a session.
              </div>
            </div>

            <NuxtLink
              class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center shrink-0"
              to="/competition/video-timer/videos"
            >
              Back to library
            </NuxtLink>
          </div>

          <div class="mt-5 rounded-xl border border-gray-200 bg-white p-6">
            <div class="space-y-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Video file</label>

                <div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                  <input
                    type="file"
                    accept="video/*"
                    class="block w-full text-sm text-gray-700 file:mr-3 file:h-10 file:border-0 file:rounded-md file:bg-gray-200 file:px-4 file:text-sm file:font-medium file:text-gray-900 hover:file:bg-gray-300"
                    @change="onFileChange"
                  >
                </div>
              </div>

              <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                  <div>
                    <div class="text-xs font-medium uppercase tracking-wide text-gray-500">File</div>
                    <div class="mt-1 break-all text-gray-900">{{ selectedFileName || "—" }}</div>
                  </div>

                  <div>
                    <div class="text-xs font-medium uppercase tracking-wide text-gray-500">Size</div>
                    <div class="mt-1 text-gray-900">{{ selectedFileSize }}</div>
                  </div>
                </div>
              </div>

              <div
                v-if="uploadError"
                class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {{ uploadError }}
              </div>

              <div class="flex items-center justify-end gap-2 pt-1">
                <NuxtLink
                  class="h-10 px-4 rounded-md bg-gray-200 text-gray-900 flex items-center"
                  to="/competition/video-timer/videos"
                >
                  Cancel
                </NuxtLink>

                <button
                  class="h-10 px-4 rounded-md bg-blue-600 text-white disabled:bg-blue-300"
                  type="button"
                  :disabled="!selectedFile || isUploading"
                  @click="uploadVideo"
                >
                  <span v-if="isUploading">Uploading…</span>
                  <span v-else>Upload video</span>
                </button>
              </div>
            </div>
          </div>

          <div v-if="uploadedVideoId" class="mt-4 text-xs text-gray-500">
            Uploaded video id: {{ uploadedVideoId }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>