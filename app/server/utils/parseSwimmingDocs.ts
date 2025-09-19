
import * as XLSX from 'xlsx'
// 2025-SECC-Qualifying-Times_updated-Nov-2024_-final
export function parseSwimmingPdf(text: string) {
    const ages = ['10 & 11', '12', '13', '14', '15', '16', '17+'];
    const isStrokeWord = (w: string) =>
        ['Freestyle', 'Breaststroke', 'Butterfly', 'Backstroke', 'IM'].includes(w);

    const rawLines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const events: any[] = [];

    const pushEvent = (distance: string, stroke: string, femaleRaw: string[], maleRaw: string[]) => {
        const eventName = `${distance} ${stroke}`;

        const femaleTimes = Array(ages.length - femaleRaw.length).fill(null).concat(femaleRaw);
        const maleTimes = Array(ages.length - maleRaw.length).fill(null).concat(maleRaw);

        ages.forEach((age, idx) => {
            const femaleTime = femaleTimes[idx] ?? null;
            const maleTime = maleTimes[idx] ?? null;

            if (age === "10 & 11") {
                [10, 11].forEach(a => {
                    events.push({ gender: 'female', age: a, distance, stroke, event: eventName, time: femaleTime });
                    events.push({ gender: 'male', age: a, distance, stroke, event: eventName, time: maleTime });
                });
            } else {
                events.push({ gender: 'female', age, distance, stroke, event: eventName, time: femaleTime });
                events.push({ gender: 'male', age, distance, stroke, event: eventName, time: maleTime });
            }
        });
    };

    const isTime = (t: string) => /\d+\.\d/.test(t);

    for (let i = 0; i < rawLines.length; i++) {
        const parts = rawLines[i].split(/\s+/).filter(Boolean);
        if (!parts.length) continue;

        const anchorIdx = parts.findIndex((p, idx) =>
            /^\d{2,4}$/.test(p) && isStrokeWord(parts[idx + 1])
        );
        if (anchorIdx === -1) continue;

        const distance = parts[anchorIdx];
        let stroke = parts[anchorIdx + 1];
        if (stroke === "IM") stroke = "Individual Medley";

        const leftTokens = parts.slice(0, anchorIdx);
        const rightTokens = parts.slice(anchorIdx + 2);

        // sepcial case: Breaststroke 
        if (stroke === "Breaststroke" && leftTokens.length === 0 && i > 0) {
            const prevParts = rawLines[i - 1].split(/\s+/).filter(Boolean);
            const femaleTokens = prevParts.filter(isTime);

            let maleTokens = rightTokens.filter(isTime);
            let j = i + 1;
            while (maleTokens.length < ages.length && j < rawLines.length) {
                const nextParts = rawLines[j].split(/\s+/).filter(Boolean);
                const nextAnchorIdx = nextParts.findIndex((p, idx) =>
                    /^\d{2,4}$/.test(p) && isStrokeWord(nextParts[idx + 1])
                );
                if (nextAnchorIdx !== -1) break;
                maleTokens = maleTokens.concat(nextParts.filter(isTime));
                j++;
            }

            pushEvent(distance + "m", "Breaststroke", femaleTokens, maleTokens.slice(0, ages.length));
            i = j - 1;
            continue;
        }

        const femaleRaw = leftTokens.filter(isTime);
        const maleRaw = rightTokens.filter(isTime);
        pushEvent(distance + "m", stroke, femaleRaw, maleRaw);
    }

    return events;
}

// 2026 Qualifying times
export function parseSwimmingPdfLayout2(text: string) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    const ages = ["10 & 11", "12", "13", "14", "15", "16", "17/OV"];

    const structured = [];
    let currentGender = null;

    for (const line of lines) {
        // detect gender
        if (/Mens\/Open/i.test(line)) {
            currentGender = "male";
            continue;
        }
        if (/Female/i.test(line)) {
            currentGender = "female";
            continue;
        }

        if (/^EVENT\b/i.test(line)) continue; // ignore headers

        if (/^\d{2,4}m/i.test(line)) {
            const parts = line.split(/\s+/);
            const event = parts[0] + " " + parts[1];
            const distance = parts[0];
            let stroke = parts[1];

            if (stroke === "IM" || stroke === "Medley") {
                stroke = "Individual Medley";
            }

            let times = parts.slice(2);

            if (times.length < ages.length) {
                times = Array(ages.length - times.length).fill(null).concat(times);
            }

            ages.forEach((ageLabel, idx) => {
                const time = times[idx] || null;

                if (ageLabel === "10 & 11") {
                    structured.push({ gender: currentGender, event, distance, stroke, age: "10", time });
                    structured.push({ gender: currentGender, event, distance, stroke, age: "11", time });
                } else if (ageLabel === "17/OV") {
                    structured.push({ gender: currentGender, event, distance, stroke, age: "17+", time });
                } else {
                    structured.push({ gender: currentGender, event, distance, stroke, age: ageLabel, time });
                }
            });
        }
    }

    return structured;
}


// 2025-Dorset-County-ASA-Championships-Entry-Information-Iss-4-071124
export function parseSwimmingPdfLayout3(text: string) {
    const ages = ["10/11", "12", "13", "14", "15", "16", "17/OV"];
    const rawLines = text.split("\n").map(l => l.trim()).filter(Boolean);

    const events: any[] = [];
    let currentGender: "male" | "female" | null = null;
    let currentStroke: string | null = null;

    const strokes = ["FREESTYLE", "BREASTSTROKE", "BUTTERFLY", "BACKSTROKE", "IND MEDLEY"];

    // times like 43.38, 1:34.75 ou 1.34.75
    const isTime = (t: string) => /^\d+(?:\.\d+){1,2}$/.test(t);

    for (const line of rawLines) {

        if (/\bFEMALE\b/i.test(line)) {
            currentGender = "female";
            continue;
        }

        if (/\bMALE\b/i.test(line) || /\bMALE\b/i.test(line)) {
            currentGender = "male";
            continue;
        }


        // ignore headers
        if (/^(?:DORSET|CONSIDERATION|φτφ|^\d{1,2}$)/i.test(line)) continue;

        const parts = line.split(/\s+/);

        // stroke detection
        const firstTwo = parts.slice(0, 2).join(" ").toUpperCase();
        const firstOne = parts[0].toUpperCase();

        if (strokes.includes(firstTwo)) {
            currentStroke = firstTwo;
            parts.splice(0, 2); // remove stroke
        } else if (strokes.includes(firstOne)) {
            currentStroke = firstOne;
            parts.splice(0, 1);
        }

        // Distance (50m, 100m, 200m, etc.)
        const distanceIdx = parts.findIndex(p => /^\d{1,4}m$/i.test(p.replace(/\s+/g, "")));
        if (distanceIdx === -1) continue;

        const distance = parts[distanceIdx].replace(/\s+/g, "");
        const timesRaw = parts.slice(distanceIdx + 1).map(t => (isTime(t) ? t : null));

        // Check for nulls
        const missing = Math.max(0, ages.length - timesRaw.length);
        const filledTimes = [...timesRaw, ...Array(missing).fill(null)].slice(0, ages.length);

        events.push({
            gender: currentGender,
            event: `${distance} ${currentStroke}`,
            distance,
            stroke: currentStroke,
            times: ages.map((age, idx) => ({ age, time: filledTimes[idx] }))
        });
    }

    return normalizeLayout3(events);
}

export const normalizeTime3 = (time: string | null): string => {
    if (!time) return "0.00";
    const dotCount = (time.match(/\./g) || []).length;

    if (dotCount === 1) {
        return time;
    }

    if (dotCount >= 2) {
        const parts = time.split(".");
        const minutes = parseInt(parts[0], 10) || 0;
        const seconds = parseInt(parts[1], 10) || 0;

        const hh = "00";
        const mm = String(minutes).padStart(2, "0");
        const ss = String(seconds).padStart(2, "0");

        return `${hh}:${mm}:${ss}`;
    }

    // se vier no formato com ":", trata normal
    const parts = time.split(":");
    if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10) || 0;
        const seconds = parseInt(parts[1], 10) || 0;
        return `00:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    if (parts.length === 3) {
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        const seconds = parseInt(parts[2], 10) || 0;
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return time;
};

export function normalizeLayout3(events: any[]) {
    const normalized: any[] = [];

    events.forEach(event => {
        let stroke = event.stroke;

        if (stroke === "IM" || stroke === "Medley" || stroke === "IND MEDLEY") {
            stroke = "Individual Medley";
        }

        if (stroke === "FREESTYLE") {
            stroke = "Freestyle";
        }

        if (stroke === "BREASTSTROKE") {
            stroke = "Breaststroke";
        }

        if (stroke === "BUTTERFLY") {
            stroke = "Butterfly";
        }

        if (stroke === "BACKSTROKE") {
            stroke = "Backstroke";
        }

        event.times.forEach((t: { age: string, time: string | null }) => {
            let age = t.age;
            if (age === "10/11" || age === "10 & 11") {
                normalized.push({
                    gender: event.gender,
                    event: event.event,
                    distance: event.distance,
                    stroke: stroke,
                    age: "10",
                    time: normalizeTime3(t.time)
                });
                normalized.push({
                    gender: event.gender,
                    event: event.event,
                    distance: event.distance,
                    stroke: stroke,
                    age: "11",
                    time: normalizeTime3(t.time)
                });
            } else if (age === "17/OV") {
                normalized.push({
                    gender: event.gender,
                    event: event.event,
                    distance: event.distance,
                    stroke: stroke,
                    age: "17+",
                    time: normalizeTime3(t.time)
                });
            } else {
                normalized.push({
                    gender: event.gender,
                    event: event.event,
                    distance: event.distance,
                    stroke: stroke,
                    age,
                    time: normalizeTime3(t.time)
                });
            }
        });
    });

    return normalized;
}


// 2025-Devon-Championship-Qualifying-Times-V3
export function parseSwimmingXlsx(buffer: ArrayBuffer | Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    // read all rows as array of arrays
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false })

    const ages = ['10yrs', '11yrs', '12yrs', '13yrs', '14yrs', '15yrs', '16yrs', '17/ov']

    const events: any[] = []
    let currentDistance = ''
    let currentStroke = ''

    // headers to ignore
    const headersToIgnore = ['DEVON', 'DORSET', 'CONSIDERATION', 'Entry times', 'Ages as at', 'Open / Male']

    for (let row of rows) {
        row = row.map(cell => cell ? cell.toString().trim() : '')

        const middleCells = row.slice(1, row.length - 1)

        // skip empty row
        if (!row.some(cell => cell)) continue

        const rowStr = row.map(cell => cell.replace(/\s+/g, ' ').trim()).join(' ')

        // skip age row 
        if (headersToIgnore.some(h => rowStr.toUpperCase().includes(h.toUpperCase()))) continue

        // ignora linha de idades
        if (row.every(cell => ages.includes(cell))) continue

        // detect distance + stroke
        const distanceStrokeCell = middleCells.find(cell => /\d{2,3}m/.test(cell) && /[A-Za-z]/.test(cell))
        if (distanceStrokeCell) {
            const parts = distanceStrokeCell.split(' ')
            currentDistance = parts[0]
            currentStroke = parts.slice(1).join(' ')
            if (currentStroke === 'IM' || currentStroke === 'Medley' || currentStroke == 'Ind Medley') currentStroke = 'Individual Medley'
            continue
        }

        const numericCells = Array.from(row.slice(1, row.length - 1), cell => {
            if (!cell) return '&';
            return normalizeTime(cell);
        });

        const maleTimes = numericCells.slice(0, 8).map(t => (t === '&' ? null : t));
        const femaleTimes = numericCells.slice(9, 17).map(t => (t === '&' ? null : t));

        ages.forEach((age, idx) => {
            events.push({
                gender: 'male',
                age: normalizeAge(age),
                distance: currentDistance,
                stroke: currentStroke,
                event: `${currentDistance} ${currentStroke}`,
                time: maleTimes[idx] || null
            })
            events.push({
                gender: 'female',
                age: normalizeAge(age),
                distance: currentDistance,
                stroke: currentStroke,
                event: `${currentDistance} ${currentStroke}`,
                time: femaleTimes[idx] || null
            })
        })
    }

    return events
}

function normalizeTime(t: string | null): string | null {
    if (!t) return null
    t = t.replace(',', '.').trim()

    // already in hh:mm:ss or mm:ss
    if (t.includes(':')) {
        const parts = t.split(':')
        if (parts.length === 2) {
            const [m, s] = parts
            return `00:${m.padStart(2, '0')}:${Math.round(parseFloat(s)).toString().padStart(2, '0')}`
        } else if (parts.length === 3) {
            const [h, m, s] = parts
            return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${Math.round(parseFloat(s)).toString().padStart(2, '0')}`
        }
    }

    // format like 0140.8 or 0118.6 -> MMSS.s
    const match = t.match(/^0?(\d{2,})(\d{2})(?:\.(\d+))?$/)
    if (match) {
        const minutes = parseInt(match[1], 10)
        const seconds = parseInt(match[2], 10)
        // arredonda milissegundos, pode descartar se não quiser
        return `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    // fallback
    return t
}

function normalizeAge(age: string | null | undefined): string {
    if (!age) return ''

    switch (age) {
        case '10yrs': return '10'
        case '11yrs': return '11'
        case '12yrs': return '12'
        case '13yrs': return '13'
        case '14yrs': return '14'
        case '15yrs': return '15'
        case '16yrs': return '16'
        case '17/ov': return '17+'
        default: return age
    }
}
