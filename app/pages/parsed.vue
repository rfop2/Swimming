<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { timeToSeconds } from "lib"


definePageMeta({
    layout: "secure",
    middleware: ["protected"]
})

const structuredData = ref([])
const selections = ref([])
const activeGender = ref('Male')
const activeStroke = ref('All')

const genders = ['Male', 'Female']
const editingTime = ref({}) // { [eventIndex_age]: true/false }

function startEditing(eventIdx, age) {
    editingTime.value[`${eventIdx}_${age}`] = true
}

function finishEditing(eventIdx, age, e) {
    const val = e.target.value.trim()
    structuredData.value.find((item, idx) => idx === eventIdx && item.age === age).time = val
    editingTime.value[`${eventIdx}_${age}`] = false
}

function handleKey(e, eventIdx, age) {
    if (e.key === 'Enter') e.target.blur()
}

onMounted(() => {
    const stored = sessionStorage.getItem('parsedData')
    if (stored) {
        const parsed = JSON.parse(stored)
        structuredData.value = parsed.structured
        selections.value = parsed.selections
    } else {
        console.warn('No parsedData found in sessionStorage')
    }
})

const strokes = computed(() => {
    const allStrokes = structuredData.value.map(item => item.stroke).filter(Boolean)
    return ['All', ...Array.from(new Set(allStrokes))]
})

const filteredData = computed(() => {
    const filtered = structuredData.value
        .filter(item =>
            item.gender?.toLowerCase() === activeGender.value.toLowerCase()
        )
        .filter(item =>
            activeStroke.value === 'All' || item.stroke === activeStroke.value
        )

    return filtered.reduce((acc, item) => {
        if (!acc[item.event]) acc[item.event] = []
        acc[item.event].push(item)
        return acc
    }, {})
})

const saveSuccess = ref(false)
const errString = ref<string | null>(null)
function normalizeStroke(stroke: string) {
    switch (stroke.toLowerCase()) {
        case 'Backstroke': return 'backstroke'
        case 'Breaststroke': return 'breaststroke'
        case 'Butterfly': return 'butterfly'
        case 'Freestyle': return 'freestyle'
        case 'im':
        case 'medley':
        case 'individual medley':
            return 'individual_medley'
        default:
            return stroke.toLowerCase()
    }
}
function mapToImportRows(structured: any[], selections: any) {
    const created = new Date()
    return structured.map(item => ({
        created,
        year: selections.year.value,
        course: selections.course.value,
        scope: selections.scope.value,
        area: selections.area.value,
        gender: item.gender,
        age: item.age,
        distance: item.distance,
        stroke: normalizeStroke(item.stroke),
        timeString: item.time || '00:00.00',
        time: item.time ? timeToSeconds(item.time) : 0.0
    }))
}
async function save() {
    try {
        const rows = mapToImportRows(structuredData.value, selections.value)

        await $fetch("/api/import", {
            method: "PUT",
            body: rows
        })

        saveSuccess.value = true
        await refreshNuxtData("import")
    } catch (error) {
        console.error("Error", error)
        errString.value = (error as FetchError).message ?? null
    }
}

</script>

<template>
    <StandardPage title="Parsed Results - Please Verify Time Values">
        <div class="h-screen flex flex-col">

            <div v-if="!structuredData.length" class="text-center text-gray-500">
                No data available. Please upload a file first.
            </div>

            <div v-else>
                <div class="text-gray-700 mb-4 flex gap-6">
                    <span>Year: <strong>{{ selections.year.value }}</strong></span>
                    <span>Scope: <strong>{{ selections.scope.label }}</strong></span>
                    <span>Area: <strong>{{ selections.area.label }}</strong></span>
                    <span>Course: <strong>{{ selections.course.label }}</strong></span>
                </div>

                <div class="flex space-x-4 mb-4">
                    <button v-for="g in genders" :key="g" @click="activeGender = g"
                        :class="[activeGender === g ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700', 'px-4 py-2 rounded font-semibold']">
                        {{ g }}
                    </button>
                </div>

                <div class="flex space-x-4 mb-6">
                    <button v-for="s in strokes" :key="s" @click="activeStroke = s"
                        :class="[activeStroke === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700', 'px-4 py-2 rounded font-semibold']">
                        {{ s }}
                    </button>
                </div>
                <div class="space-x-4 mb-6">
                    <button @click="save" class="bg-green-600 text-white px-4 py-2 rounded font-semibold ml-auto">
                        Save to Database
                    </button>
                </div>

                <div v-for="(events, eventName) in filteredData" :key="eventName" class="mb-8">
                    <h2 class="text-lg font-bold mb-2">{{ eventName }}</h2>
                    <table class="table-auto w-full border-collapse border border-gray-300">
                        <thead>
                            <tr class="bg-gray-200">
                                <th class="border border-gray-300 px-4 py-2 text-left">Age</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(e, idx) in events" :key="idx"
                                :class="idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'">
                                <td class="border border-gray-300 px-4 py-2">{{ e.age }}</td>
                                <td class="border border-gray-300 px-4 py-2">
                                    <div v-if="!editingTime[`${idx}_${e.age}`]">
                                        {{ e.time ?? '—' }}
                                        <button @click="editingTime[`${idx}_${e.age}`] = true"
                                            class="ml-2 text-blue-600">✏️</button>
                                    </div>
                                    <div v-else class="flex items-center gap-2">
                                        <input type="text" v-model="e.time" class="border px-2 py-1 w-20"
                                            @keyup.enter="editingTime[`${idx}_${e.age}`] = false" />
                                        <button @click="editingTime[`${idx}_${e.age}`] = false"
                                            class="text-gray-500 px-2">❌</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
        <UI-SuccessNotification v-model="saveSuccess" title="Successfully saved!" text="Data imported." />
    </StandardPage>
</template>
