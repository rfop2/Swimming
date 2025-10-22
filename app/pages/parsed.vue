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
const activeCourse = ref('lc')

const courses = [
    { value: 'lc', label: 'Long Course' },
    { value: 'sc', label: 'Short Course' }
]

const genders = ['Male', 'Female']
const editingTime = ref({})
const errorVisible = ref(false)
const errorText = ref("")

const sanitizeTime = (val: string) =>
    val
        .replace(/[^\d:.]/g, "")
        .replace(/:{2,}/g, ":")
        .replace(/\.{2,}/g, ".")
        .slice(0, 12)

const allowedNav = new Set([
    "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    "Home", "End", "Tab", "Enter", "Escape"
])

function onTimeKeydown(e: KeyboardEvent) {
    const k = e.key
    if (allowedNav.has(k)) return
    // allow Ctrl/Cmd + A/C/V/X
    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(k.toLowerCase())) return
    // allow digits, colon, dot
    if (/^\d$/.test(k) || k === ":" || k === ".") return
    e.preventDefault()
}

function onTimeInput(e: Event, modelUpdate: (v: string) => void) {
    const el = e.target as HTMLInputElement
    modelUpdate(sanitizeTime(el.value))
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
    let filtered = structuredData.value
        .filter(item =>
            item.gender?.toLowerCase() === activeGender.value.toLowerCase()
        )
        .filter(item =>
            activeStroke.value === 'All' || item.stroke === activeStroke.value
        )
    if (selections.value?.course?.value === 'both') {
        filtered = filtered.filter(item => item.course === activeCourse.value)
    }

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
// if the documents has both long/short course map to the correct course
function resolveCourseForRow(item: any, selections: any) {
    const sel = selections?.course?.value ?? selections?.course
    if (sel === "both") return item?.course ?? null
    return item?.course ?? sel ?? null
}
function mapToImportRows(structured: any[], selections: any) {
    const created = new Date()
    return structured.map(item => ({
        created,
        year: selections.year.value,
        course: resolveCourseForRow(item, selections),
        scope: selections.scope.value,
        area: selections.area.value,
        gender: item.gender,
        age: item.age,
        distance: item.distance,
        stroke: normalizeStroke(item.stroke),
        timeString: item.time || "00:00.00",
        time: item.time ? timeToSeconds(item.time) : 0.0,
    }))
}

function looksLikeTime(s: string) {
    // SS(.sss) | MM:SS(.sss) | HH:MM:SS(.sss)
    return /^(?:\d{1,2}(?:\.\d{1,3})?|\d{1,2}:\d{2}(?:\.\d{1,3})?|\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)$/.test(s)
}

function genderLabel(row: any) {
    const g = (row?.gender ?? "").toString().trim().toLowerCase();
    if (g.startsWith("f")) return "Female";
    if (g.startsWith("m")) return "Male";
    return "Male/Female";
}

function courseLabel(row: any, selections?: any) {
    const v =
        row?.course ??
        selections?.course?.value ??
        selections?.course ??
        ""

    if (typeof v === "string") {
        if (v.toLowerCase() === "lc" || /long\s*course/i.test(v)) return "LC"
        if (v.toLowerCase() === "sc" || /short\s*course/i.test(v)) return "SC"
    }
    return "LC/SC"
}

function validateStructuredTimesWithCourse(structured: any[], selections?: any) {
    const bad: string[] = [];

    for (const row of structured) {
        const t = (row.time ?? "").toString().trim();
        if (!t) continue; // allow empty
        if (!looksLikeTime(t)) {
            const courseTag = courseLabel(row, selections);
            const genderTag = genderLabel(row);
            const eventLabel = row.event || `${row.stroke} ${row.distance}`;
            bad.push(`[${courseTag} • ${genderTag} • ${eventLabel} • ${row.age}] "${t}"`);
        }
    }

    if (bad.length) {
        return {
            ok: false,
            message: `There ${bad.length === 1 ? "is" : "are"} ${bad.length} invalid time value${bad.length === 1 ? "" : "s"}: ${bad.join("; ")}`
        };
    }
    return { ok: true };
}
async function save() {
    const check = validateStructuredTimesWithCourse(structuredData.value, selections.value)
    if (!check.ok) {
        errorText.value = check.message
        errorVisible.value = true
        return
    }

    try {
        const rows = mapToImportRows(structuredData.value, selections.value)
        await $fetch("/api/import", { method: "PUT", body: rows })
        saveSuccess.value = true
        await refreshNuxtData("import")
    } catch (error) {
        errorText.value = (error as any)?.message || "Import failed."
        errorVisible.value = true
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
                <div v-if="selections.course.value === 'both'" class="flex space-x-4 mb-6">
                    <button v-for="c in courses" :key="c.value" @click="activeCourse = c.value"
                        :class="[activeCourse === c.value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700', 'px-4 py-2 rounded font-semibold']">
                        {{ c.label }}
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
                                        <input type="text" v-model="e.time" inputmode="numeric" pattern="[0-9:.]*"
                                            class="border px-2 py-1 w-20" @keydown="onTimeKeydown"
                                            @input="onTimeInput($event, v => e.time = v)"
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
        <UI-ErrorNotification v-model="errorVisible" title="Validation failed" :text="errorText" />
    </StandardPage>
</template>
