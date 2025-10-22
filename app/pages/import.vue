<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import TableFemaleEventMale from '~/components/TableFemaleEventMale.vue'
import TableMaleFemaleOpen from '~/components/TableMaleFemaleOpen.vue'
import TableMaleOpen from '~/components/TableMaleOpen.vue'
import TableXlsx from '~/components/TableXlsx.vue'
import StandardPage from "~/components/StandardPage.vue"
import { addMonths, format, getYear, parseISO } from "date-fns"
import { REGIONS, COUNTIES, NATIONALITIES } from "lib"


definePageMeta({
    layout: "secure",
    middleware: ["protected"]
})


const filterYear = getYear(addMonths(new Date(), 1))
const years = Array.from({ length: 6 }, (_, i) => filterYear - 3 + i).map(year => ({ value: year }))
const scopes = [
    {
        value: "county",
        label: "County",
    },
    {
        value: "regional",
        label: "Regional",
    },
    {
        value: "national",
        label: "National",
    },
]
const areasFromScope = (scope) => {
    if (scope === "county")
        return Object.entries(COUNTIES).map(([k, v]) => ({ label: v, value: k }))
    if (scope === "regional")
        return Object.entries(REGIONS).map(([k, v]) => ({ label: v, value: k }))
    if (scope === "national")
        return Object.entries(NATIONALITIES).map(([k, v]) => ({ label: v, value: k }))
    return []
}
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
const selections = ref({
    year: years[0],
    scope: scopes[0],
    area: { label: "", value: "" },
    course: courses[0],
})
const areas = computed(() => areasFromScope(selections.value.scope.value))

const fileUploaded = ref(false)
const router = useRouter()
const fileInput = ref(null)
const file = ref(null)
const fileType = ref('')
const pdfText = ref('')

const selectedLayoutIndex = ref(null)
const currentLayoutIndex = ref(0)

const layoutsPdf = [
    { component: TableFemaleEventMale, id: 'layout1' },
    { component: TableMaleFemaleOpen, id: 'layout2' },
    { component: TableMaleOpen, id: 'layout3' }
]

const layoutsXlsx = [
    { component: TableXlsx, id: 'xlsx' },
]

const layouts = computed(() => fileType.value === 'xlsx' ? layoutsXlsx : layoutsPdf)

const currentLayoutComponent = computed(() => layouts.value[currentLayoutIndex.value].component)


function selectLayout(index) {
    selectedLayoutIndex.value = index
}

function nextLayout() {
    if (currentLayoutIndex.value < layouts.value.length - 1) currentLayoutIndex.value++
}

function prevLayout() {
    if (currentLayoutIndex.value > 0) currentLayoutIndex.value--
}

async function sendFile() {
    if (!file.value) return alert('Please select a file')
    if (selectedLayoutIndex.value === null) return alert('Please select a layout')
    
    const formData = new FormData()
    formData.append('pdf_file', file.value)
    formData.append('layout', layouts.value[selectedLayoutIndex.value].id)

    const res = await $fetch('/api/import', {
        method: 'POST',
        body: formData
    })

    const mergedData = {
        structured: res.structured,
        selections: selections.value
    }


    sessionStorage.setItem('parsedData', JSON.stringify(mergedData))

    router.push('/parsed')
}

function handleFileUpload() {
    if (!fileInput.value?.files?.length) return

    file.value = fileInput.value.files[0]

    const name = file.value.name.toLowerCase()
    if (name.endsWith('.pdf')) fileType.value = 'pdf'
    else if (name.endsWith('.xlsx')) fileType.value = 'xlsx'
    else {
        alert('Unsupported file type. Please upload PDF or XLSX.')
        fileInput.value.value = ''
        return
    }

    fileUploaded.value = true
    currentLayoutIndex.value = 0
    selectedLayoutIndex.value = null
}

function resetUpload() {
    fileUploaded.value = false
    fileType.value = ''
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
                    <button @click="resetUpload"
                        class="px-4 py-2 bg-gray-300 text-black rounded mb-4 hover:bg-gray-400">
                        Change file
                    </button>
                </div>
                <div v-if="!file">
                    <button @click="$refs.fileInput.click()"
                        class="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Choose File
                    </button>
                    <input type="file" ref="fileInput" @change="handleFileUpload" class="hidden" />
                </div>
                <div class="flex flex-col items-center justify-center" v-else>
                    <h1 class="text-3xl font-bold pb-10 mt-10" v-if="selectedLayoutIndex == null">
                        Please choose a layout similar to your {{ fileType.toUpperCase() }} file
                    </h1>
                    <h1 class="text-3xl font-bold pb-10 mt-10" v-if="selectedLayoutIndex !== null">
                        Please choose a year, scope, area and course
                    </h1>

                    <div v-if="file" class="mb-4 text-gray-700 font-medium">
                        Selected file: <span class="font-semibold">{{ file.name }}</span>
                    </div>

                    <div class="flex flex-row space-x-4 mb-4">

                        <div v-if="selectedLayoutIndex !== null" class="flex space-x-4">
                            <div class="min-w-24">
                                <UI-Listbox v-model="selections.year" :options="years" label="Year"
                                    placeholder="Choose Year" />
                            </div>
                            <div class="min-w-32">
                                <UI-Listbox v-model="selections.scope" :options="scopes" label="Scope"
                                    placeholder="Choose Scope" />
                            </div>
                            <div class="min-w-48">
                                <UI-Listbox v-model="selections.area" :options="areas" label="Area"
                                    placeholder="Choose Area" />
                            </div>
                            <div class="min-w-28">
                                <UI-Listbox v-model="selections.course" :options="courses" label="Course"
                                    placeholder="Choose Course" />
                            </div>
                        </div>

                        <button v-if="selectedLayoutIndex === null" @click="selectLayout(currentLayoutIndex)"
                            class="px-4 py-2 bg-green-600 text-white rounded mb-4 hover:bg-green-700">
                            Select this layout
                        </button>
                    </div>

                    <div
                        v-if="selectedLayoutIndex !== null && selections.year.value && selections.scope.value && selections.area.value">
                        <button @click="sendFile" class="mb-4 px-4 py-2 bg-blue-600 text-white rounded">
                            Send
                        </button>
                    </div>

                    <component :is="currentLayoutComponent" class="mb-4" v-if="selectedLayoutIndex === null" />

                    <div class="flex space-x-2 mb-4 justify-between" v-if="selectedLayoutIndex === null">
                        <button @click="prevLayout" :disabled="currentLayoutIndex === 0"
                            class="px-4 py-2 bg-gray-300 rounded disabled:opacity-50">
                            Back
                        </button>
                        <button @click="nextLayout" :disabled="currentLayoutIndex === layouts.length - 1"
                            class="px-4 py-2 bg-gray-300 rounded disabled:opacity-50">
                            Next
                        </button>
                    </div>
                </div>

            </div>
        </template>

        <div v-if="pdfText" class="mt-4 p-4 border rounded w-96 overflow-auto">
            <pre>{{ pdfText }}</pre>
        </div>

    </StandardPage>
</template>
