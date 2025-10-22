
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
                    events.push({ gender: 'female', age: a, distance, stroke, event: eventName, time: normalizeTime(femaleTime) });
                    events.push({ gender: 'male', age: a, distance, stroke, event: eventName, time: normalizeTime(maleTime) });
                });
            } else {
                events.push({ gender: 'female', age, distance, stroke, event: eventName, time: normalizeTime(femaleTime) });
                events.push({ gender: 'male', age, distance, stroke, event: eventName, time: normalizeTime(maleTime) });
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
                    time: normalizeTime(t.time)
                });
                normalized.push({
                    gender: event.gender,
                    event: event.event,
                    distance: event.distance,
                    stroke: stroke,
                    age: "11",
                    time: normalizeTime(t.time)
                });
            } else if (age === "17/OV") {
                normalized.push({
                    gender: event.gender,
                    event: event.event,
                    distance: event.distance,
                    stroke: stroke,
                    age: "17+",
                    time: normalizeTime(t.time)
                });
            } else {
                normalized.push({
                    gender: event.gender,
                    event: event.event,
                    distance: event.distance,
                    stroke: stroke,
                    age,
                    time: normalizeTime(t.time)
                });
            }
        });
    });

    return normalized;
}

// 2025-Devon-Championship-Qualifying-Times-V3
export function parseSwimmingXlsx(buffer: ArrayBuffer | Buffer) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // read all rows as array of arrays
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    const ages = ["10yrs", "11yrs", "12yrs", "13yrs", "14yrs", "15yrs", "16yrs", "17/ov"];
    const events: any[] = [];
    let currentDistance = "";
    let currentStroke = "";

    const headersToIgnore = ["DEVON", "DORSET", "CONSIDERATION", "Entry times", "Ages as at", "Open / Male"];


    for (let row of rows) {
        row = row.map((cell) => (cell ? cell.toString().trim() : ""));

        const middleCells = row.slice(1, row.length - 1);

        if (!row.some((cell) => cell)) continue;

        const rowStr = row.map((cell) => cell.replace(/\s+/g, " ").trim()).join(" ");

        if (headersToIgnore.some((h) => rowStr.toUpperCase().includes(h.toUpperCase()))) continue;
        if (row.every((cell) => ages.includes(cell))) continue;

        const distanceStrokeCell = middleCells.find((cell) => /\d{2,3}m/.test(cell) && /[A-Za-z]/.test(cell));
        if (distanceStrokeCell) {
            const parts = distanceStrokeCell.split(" ");
            currentDistance = parts[0];
            currentStroke = parts.slice(1).join(" ");
            if (["IM", "Medley", "Ind Medley"].includes(currentStroke)) currentStroke = "Individual Medley";
            continue;
        }

        const numericCells = Array.from(row.slice(1, row.length - 1), (cell) => {
            if (!cell) return null;
            const fixed = fixRawTime(cell);
            return normalizeTime(fixed);
        });

        const maleTimes = numericCells.slice(0, 8).map((t) => (t === null ? null : t));
        const femaleTimes = numericCells.slice(9, 17).map((t) => (t === null ? null : t));

        ages.forEach((age, idx) => {
            events.push({
                gender: "male",
                age: normalizeAge(age),
                distance: currentDistance,
                stroke: currentStroke,
                event: `${currentDistance} ${currentStroke}`,
                time: maleTimes[idx] || null,
            });
            events.push({
                gender: "female",
                age: normalizeAge(age),
                distance: currentDistance,
                stroke: currentStroke,
                event: `${currentDistance} ${currentStroke}`,
                time: femaleTimes[idx] || null,
            });
        });
    }

    return events;
}


// 2025-hcasa-champs-qts-v2
export function parseSwimmingPdfLayout4(text: string) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    const ages = ["10-11", "12", "13", "14", "15", "16", "17"];
    const strokes = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM"];
    const distances = ["50", "100", "200", "400", "800", "1500"];

    const structured: any[] = [];
    let currentCourse: "lc" | "sc" | null = null;
    let currentGender: "male" | "female" | null = null;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        let line = lines[lineIndex];
        // Detect course
        if (/Qualifying Times.*LONG COURSE/i.test(line)) {
            currentCourse = "lc";
            continue;
        }
        if (/Qualifying Times.*SHORT COURSE/i.test(line)) {
            currentCourse = "sc";
            continue;
        }

        if (lineIndex < 39) {
            currentGender = "female";
        } else {
            currentGender = "male";
        }

        // Ignore headers
        if (
            /Automatic Times/i.test(line) ||
            /Consideration Times/i.test(line) ||
            /Stroke\s*Distance/i.test(line)
        ) {
            continue;
        }

        // Encontrar stroke na linha
        let matchedStroke: string | null = null;
        let distance: string | null = null;


        for (let stroke of strokes) {
            const strokeIndex = line.indexOf(stroke);

            if (strokeIndex !== -1) {
                matchedStroke = stroke;

                const timesPart = line.slice(0, strokeIndex).trim();

                const afterStroke = line.slice(strokeIndex + stroke.length);
                distance = distances.find(d => afterStroke.startsWith(d));
                if (!distance) continue;

                line = `${timesPart} ${stroke} ${distance}`;
                break;
            }
        }

        if (!matchedStroke || !distance) continue;

        line = line.replace(/n\/a(?=\d)/gi, "n/a ");

        const event = `${matchedStroke} ${distance}m`;

        const timesRaw = line.split(`${matchedStroke} ${distance}`)[0].trim().split(/\s+/).filter(Boolean);

        matchedStroke = matchedStroke === "IM" ? "Individual Medley" : matchedStroke;

        const times = timesRaw.length < ages.length
            ? Array(ages.length - timesRaw.length).fill(null).concat(timesRaw)
            : timesRaw;


        for (let idx = 0; idx < ages.length; idx++) {
            const ageLabel = ages[idx];
            const rawTime = times[idx] ?? null;
            let time = rawTime && rawTime.toLowerCase() !== "n/a" ? rawTime : null;
            time = normalizeTime(time);

            if (ageLabel === "10-11") {
                structured.push({ gender: currentGender, course: currentCourse, event, distance: distance + "m", stroke: matchedStroke, age: "10", time });
                structured.push({ gender: currentGender, course: currentCourse, event, distance: distance + "m", stroke: matchedStroke, age: "11", time });
            } else if (ageLabel === "17") {
                structured.push({ gender: currentGender, course: currentCourse, event, distance: distance + "m", stroke: matchedStroke, age: "17+", time });
            } else {
                structured.push({ gender: currentGender, course: currentCourse, event, distance: distance + "m", stroke: matchedStroke, age: ageLabel, time });
            }
        }

    }

    return structured;
}

//2025-qualifying-times_079840
export function parseSwimmingPdfLayout5(text: string) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    const AGE_COLS = ["10-11", "12", "13", "14", "15", "16", "17"];
    const course: "sc" = "sc";
    const structured: any[] = [];

    let gender: "female" | "male" | null = null;

    const EVENT_RX = /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Individual\s+Medley)(?:\s+(.*))?$/i;
    const TIME_RX = /^\d{1,2}:\d{2}(?:\.\d{2})?$/i;

    const isMeta = (s: string) =>
        /\bYears\b/i.test(s) ||
        /\bAccepted\b/i.test(s) ||
        /\bConsidered\b/i.test(s) ||
        /SHORT\s*COURSE/i.test(s) ||
        /^Ages are/i.test(s) ||
        /^v\d/i.test(s) ||
        /^County/i.test(s) ||
        /^OXFORDSHIRE/i.test(s) ||
        /^Affiliated/i.test(s) ||
        /^\(?Under/i.test(s);

    const onlyTimesLine = (s: string) => {
        const toks = s.split(/\s+/).filter(Boolean);
        return toks.length > 0 && toks.every(t => TIME_RX.test(t) || /^n\/a$/i.test(t));
    };

    const timesFrom = (s: string) =>
        s.split(/\s+/).filter(t => TIME_RX.test(t) || /^n\/a$/i.test(t));

    const normalize = (t: string | null) => {
        if (!t) return null;
        const s = t.trim();
        if (!s || /^n\/a$/i.test(s)) return null;
        // se existir no escopo
        return typeof normalizeTime === "function" ? normalizeTime(s) : s;
    };

    const expectedCount = (distance: string, stroke: string) => {
        if (distance === "800m" || distance === "1500m") return 6; // sem 10/11
        if (distance === "400m" && /Individual\s+Medley/i.test(stroke)) return 6; // 400 IM
        return 7;
    };

    const pushRow = (distance: string, stroke: string, acceptedTimes: (string | null)[]) => {
        let aligned: (string | null)[];
        if (acceptedTimes.length >= 7) aligned = acceptedTimes.slice(0, 7);
        else if (acceptedTimes.length === 6) aligned = [null, ...acceptedTimes]; // faltou 10/11
        else aligned = Array(7 - acceptedTimes.length).fill(null).concat(acceptedTimes);

        const event = `${stroke} ${distance}`;

        for (let i = 0; i < AGE_COLS.length; i++) {
            const label = AGE_COLS[i];
            const t = normalize(aligned[i] ?? null);

            if (label === "10-11") {
                structured.push({ gender, course, event, distance, stroke, age: "10", time: t });
                structured.push({ gender, course, event, distance, stroke, age: "11", time: t });
            } else if (label === "17") {
                structured.push({ gender, course, event, distance, stroke, age: "17+", time: t });
            } else {
                structured.push({ gender, course, event, distance, stroke, age: label, time: t });
            }
        }
    };

    type Pending = { distance: string; stroke: string; tokens: string[]; inline: boolean };
    let pending: Pending | null = null;

    const finalizePending = () => {
        if (!pending || !gender) { pending = null; return; }
        const N = expectedCount(pending.distance, pending.stroke);

        let accepted: string[];
        if (pending.inline) {
            // tempos vieram na mesma linha do evento => pares intercalados (A,C,A,C…)
            accepted = pending.tokens.length >= N * 2
                ? pending.tokens.filter((_, i) => i % 2 === 0).slice(0, N)
                : pending.tokens.slice(0, N);
        } else {
            // tempos vieram em linhas separadas => blocos (A... C...)
            accepted = pending.tokens.slice(0, N);
        }

        pushRow(pending.distance, pending.stroke, accepted);
        pending = null;
    };

    for (const raw of lines) {
        const line = raw.replace(/\s{2,}/g, " ").trim();
        if (!line) continue;

        // cabeçalhos de gênero
        if (/^FEMALE$/i.test(line)) { finalizePending(); gender = "female"; continue; }
        if (/^(OPEN\s*\/\s*MALE|MALE\s*\/\s*OPEN|OPEN\/MALE|MALE\/OPEN|OPEN|MALE)$/i.test(line)) {
            finalizePending(); gender = "male"; continue;
        }

        if (isMeta(line)) continue;

        // evento (pode ou não ter tempos na mesma linha)
        const m = EVENT_RX.exec(line);
        if (m) {
            finalizePending();
            const distance = `${m[1]}m`;
            const stroke = m[2].replace(/\s+/g, " ") === "Individual Medley" ? "Individual Medley" : m[2];
            const inlineTokens = m[3] ? timesFrom(m[3]) : [];
            pending = { distance, stroke, tokens: inlineTokens, inline: inlineTokens.length > 0 };
            // se já veio com tempos, pode finalizar agora (intercalado)
            if (pending.inline) finalizePending();
            continue;
        }

        // somente tempos (podem vir linha a linha)
        if (pending && onlyTimesLine(line)) {
            pending.tokens.push(...timesFrom(line));
            continue;
        }
    }

    finalizePending();
    return structured;
}

// 2026-CQTs
export function parseSwimmingPdfLayout6(text: string) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    const AGES8 = ["10-11", "12", "13", "14", "15", "16", "17", "18+"];
    const course: "sc" = "sc";
    const structured: any[] = [];

    let gender: "female" | "male" | null = null;
    let eventHeaderCount = 0;

    const EVENT_RX = /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Individual\s*Medley)\s*(.*)$/i;
    // capta "38.00", "1:28.00", "1.28.00", "05:16.00", "3.27.00" etc.
    const TIME_TOKEN_RX = /(?:(?:\d{1,2}[:.]){2}\d{2})|(?:\d{1,2}[:.]\d{2})/g;

    const isEventHeader = (s: string) => /^EVENT\s*10\/?11/i.test(s.replace(/\s+/g, ""));
    const isMeta = (s: string) =>
        /Qualifying Times/i.test(s) ||
        /Somerset ASA/i.test(s) ||
        /FEMALE\s*2026/i.test(s) ||
        /OPEN\s*\/\s*MALE\s*2026/i.test(s) ||
        /^\.?$/.test(s);

    const extractTimes = (s: string): string[] => s.match(TIME_TOKEN_RX) ?? [];

    const expectedCount = (distance: string, stroke: string) => {
        const isIM = /Individual\s*Medley/i.test(stroke);
        if (distance === "800m" || distance === "1500m") return 7;
        if (distance === "400m" && isIM) return 7;
        return 8;
    };

    const alignTo8 = (times: (string | null)[], distance: string, stroke: string) => {
        const need = expectedCount(distance, stroke);
        let arr = times.slice(0, need);

        if (need === 7) {
            arr = [null, ...arr];
        }

        if (arr.length < 8) arr = arr.concat(Array(8 - arr.length).fill(null));

        // garante 8 posições
        return arr.slice(0, 8);
    };

    const pushStructured = (distance: string, stroke: string, times: string[]) => {
        const event = `${stroke} ${distance}`;
        const aligned8 = alignTo8(times, distance, stroke); // 8 pos

        for (let i = 0; i < AGES8.length; i++) {
            const label = AGES8[i];
            const raw = aligned8[i] ?? null;
            const t = normalizeTime(raw);

            if (label === "10-11") {
                structured.push({ gender, course, event, distance, stroke, age: "10", time: t });
                structured.push({ gender, course, event, distance, stroke, age: "11", time: t });
            } else {
                structured.push({ gender, course, event, distance, stroke, age: label, time: t });
            }
        }
    };

    for (const raw of lines) {
        if (!raw) continue;

        if (isEventHeader(raw)) {
            eventHeaderCount += 1;
            gender = eventHeaderCount === 1 ? "female" : "male";
            continue;
        }

        if (!gender) continue;
        if (isMeta(raw)) continue;

        const m = EVENT_RX.exec(raw);
        if (!m) continue;

        const distance = `${m[1]}m`;
        const stroke = /Individual\s*Medley/i.test(m[2]) ? "Individual Medley" : m[2];
        const tail = m[3] || "";

        const times = extractTimes(tail);
        if (times.length === 0) continue;

        pushStructured(distance, stroke, times);
    }

    return structured;
}

// bsbasa-2025-consideration-times_051436
export function parseSwimmingPdfLayout7(text: string) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    const AGES = ["10-11", "12", "13", "14", "15", "16", "17+"] as const;
    const course: "sc" = "sc";
    const structured: any[] = [];

    let gender: "female" | "male" | null = null;

    const EVENT_RX =
        /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|(?:Ind(?:ividual)?\.?\s*Medley|IM))$/i;

    const TIME_TOKEN_RX = /\d{1,2}(?:[:.]\d{1,2}){1,2}/g;

    const isTimesLine = (s: string) => (s.match(TIME_TOKEN_RX) ?? []).length > 0;

    const expectedCols = (distance: string, stroke: string) => {
        const isIM = /Ind(?:ividual)?\.?\s*Medley|IM/i.test(stroke);
        if (distance === "800m" || distance === "1500m") return 6; // 12..17+
        if (distance === "400m" && isIM) return 6;                 // 12..17+
        return 7;                                                  // 10/11..17+
    };

    const alignTo7 = (distance: string, stroke: string, times: string[]) => {
        const need = expectedCols(distance, stroke); // 6 ou 7
        let arr = times.slice(0, need);
        if (need === 6) arr = [null, ...arr];
        while (arr.length < 7) arr.push(null);
        return arr as (string | null)[];
    };

    const pushRows = (distance: string, strokeRaw: string, tokens: string[]) => {
        const stroke = /Ind(?:ividual)?\.?\s*Medley|IM/i.test(strokeRaw) ? "Individual Medley" : strokeRaw;
        const event = `${stroke} ${distance}`;
        const aligned = alignTo7(distance, stroke, tokens);

        for (let i = 0; i < AGES.length; i++) {
            const label = AGES[i];
            const raw = aligned[i];
            const t = normalizeTime(raw);

            if (label === "10-11") {
                structured.push({ gender, course, event, distance, stroke, age: "10", time: t });
                structured.push({ gender, course, event, distance, stroke, age: "11", time: t });
            } else {
                structured.push({ gender, course, event, distance, stroke, age: label, time: t });
            }
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detecta gênero
        if (/^FEMALE\b/i.test(line)) { gender = "female"; continue; }
        if (/^(OPEN\/MALE|OPEN\s*\/\s*MALE|MALE|OPEN)\b/i.test(line)) { gender = "male"; continue; }
        if (!gender) continue;

        const em = EVENT_RX.exec(line);
        if (!em) continue;

        const distance = `${em[1]}m`;
        const stroke = em[2];


        const need = expectedCols(distance, stroke);
        let tokens: string[] = [];
        let j = i + 1;
        while (j < lines.length && tokens.length < need) {
            const more = lines[j].match(TIME_TOKEN_RX) ?? [];
            if (more.length === 0) break;
            tokens = tokens.concat(more);
            j++;
        }
        if (tokens.length === 0) continue;

        pushRows(distance, stroke, tokens);
    }

    return structured;
}


// consideration-and-qualifying-times-v0-2--london-regional-summer-champs-2025_055780
export function parseSwimmingPdfLayout8(text: string) {
    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);

    type Gender = "female" | "male";
    type Course = "lc" | "sc";

    const AGE_COLS = ["11y/12y", "13y", "14y", "15y", "16y", "17y", "18y+"] as const;

    const courseFrom = (s: string): Course | null =>
        /LONG\s*COURSE/i.test(s) ? "lc" : (/SHORT\s*COURSE/i.test(s) ? "sc" : null);

    const EVENT_RX = /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|(?:Ind(?:ividual)?\.?\s*Medley|IM))\s*(.*)$/i;

    const TIME_RX = /(?:(?:\d{1,2}[:.]){2}\d{1,2})|(?:\d{1,2}[:.]\d{1,2}(?:[:.]\d{1,2})?)|(?:\d{1,2}[.]\d{1,2})/g;

    const PURE_TIMES_RX = /^([0-9:.]+\s*)+$/;

    const timesFrom = (s: string) => s.match(TIME_RX) ?? [];

    const NEED_TOKENS = 14;

    const pushRows = (
        out: any[],
        gender: Gender,
        course: Course,
        strokeRaw: string,
        distanceNum: string,
        tokens: string[],
    ) => {
        const stroke = /Ind(?:ividual)?\.?\s*Medley|IM/i.test(strokeRaw) ? "Individual Medley" : strokeRaw;
        const distance = `${distanceNum}m`;
        const event = `${stroke} ${distance}`;

        const qt = Array.from({ length: 7 }, (_, i) => tokens[2 * i] ?? null);
        const ct = Array.from({ length: 7 }, (_, i) => tokens[2 * i + 1] ?? null);

        for (let i = 0; i < AGE_COLS.length; i++) {
            const col = AGE_COLS[i];
            const qtT = normalizeTime(qt[i]);
            const ctT = normalizeTime(ct[i]);

            if (col === "11y/12y") {
                out.push({ gender, course, event, distance, stroke, standard: "qt", age: "11", time: qtT });
                out.push({ gender, course, event, distance, stroke, standard: "qt", age: "12", time: qtT });
                out.push({ gender, course, event, distance, stroke, standard: "ct", age: "11", time: ctT });
                out.push({ gender, course, event, distance, stroke, standard: "ct", age: "12", time: ctT });
            } else {
                out.push({ gender, course, event, distance, stroke, standard: "qt", age: col, time: qtT });
                out.push({ gender, course, event, distance, stroke, standard: "ct", age: col, time: ctT });
            }
        }
    };

    const structured: any[] = [];

    let currentCourse: Course | null = null;
    let currentGender: Gender | null = null;
    let blockWithinCourse = 0;

    let pending: { distance: string; stroke: string; tokens: string[] } | null = null;

    const flushPending = () => {
        if (!pending || !currentCourse || !currentGender) { pending = null; return; }
        // garante exatamente 14 tokens
        const toks = pending.tokens.slice(0, NEED_TOKENS);
        if (toks.length === NEED_TOKENS) {
            pushRows(structured, currentGender, currentCourse, pending.stroke, pending.distance, toks);
        }
        pending = null;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const c = courseFrom(line);
        if (c) {
            flushPending();
            currentCourse = c;
            currentGender = null;
            blockWithinCourse = 0;
            continue;
        }

        if (/^QTCT/i.test(line)) {
            flushPending();
            if (!currentCourse) continue;
            currentGender = (blockWithinCourse === 0 ? "male" : "female");
            blockWithinCourse += 1;
            continue;
        }

        if (!currentCourse || !currentGender) continue;

        const m = EVENT_RX.exec(line);
        if (m) {
            flushPending();

            const [, distanceNum, stroke, tail] = m;
            const tokens = timesFrom(tail || "");
            pending = { distance: distanceNum, stroke, tokens };

            if (pending.tokens.length < NEED_TOKENS) {
                let j = i + 1;
                while (j < lines.length && pending.tokens.length < NEED_TOKENS) {
                    const nxt = lines[j];
                    if (PURE_TIMES_RX.test(nxt)) {
                        pending.tokens.push(...timesFrom(nxt));
                        j++;
                        i = j - 1;
                    } else {
                        break;
                    }
                }
            }

            flushPending();
            continue;
        }

        if (/^(FEMALE|OPEN\/?MALE|11y\/?12y|Age|Notes|QUALIFYING|CONSIDERATION)/i.test(line)) {
            flushPending();
            continue;
        }
    }

    flushPending();
    return structured;
}

// cornwall-county-championships-2025-qts_057406
export function parseSwimmingPdfLayout9(text: string) {
    type Gender = "female" | "male";
    const course: "sc" = "sc";

    const AGE_COLS = ["10-11", "12", "13", "14", "15", "16", "17+"] as const;

    const EVENT_RX =
        /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Fly|IM|Individual(?:\s+Medley)?)(?:\s+(.*))?$/i;

    const TIME_RX =
        /(?:(?:\d{1,2}[:.])?\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)|(?:\d{1,2}[.]\d{2})/g;

    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);
    const structured: any[] = [];

    let gender: Gender | null = null;

    // helpers
    const genderFrom = (s: string): Gender | null => {
        if (/^FEMALE\b/i.test(s)) return "female";
        if (/^(?:OPEN\s*\/\s*MALE|OPEN\/MALE|MALE|OPEN\s*MALE)\b/i.test(s)) return "male";
        return null;
    };

    const timesFrom = (s: string) => (s.match(TIME_RX) || []);

    const isPureTimes = (s: string) => {
        const t = timesFrom(s);
        return t.length > 0 && t.join(" ") === s.replace(/\s+/g, " ");
    };

    const isMeta = (s: string) =>
        /Cornwall|County|Championship|Qualifying|Times|Age\s|Over|Notes/i.test(s) ||
        /^-+$/.test(s) ||
        s === ".";

    const normStroke = (raw: string) => {
        if (/^fly$/i.test(raw)) return "Butterfly";
        if (/^im$/i.test(raw) || /Individual\s+Medley/i.test(raw)) return "Individual Medley";
        return raw.replace(/\s+/g, " ");
    };

    const expectedCount = (distance: string, stroke: string) => {
        const d = `${distance}`; // "50", "100", ..., "1500"
        const isIM = /Individual\s+Medley/i.test(stroke) || /^IM$/i.test(stroke);
        if (d === "800" || d === "1500") return 6;        // 12..17+
        if (d === "400" && isIM) return 6;                // 400 IM sem 10-11
        return 7;                                         // demais: 10-11..17+
    };

    const alignTo7 = (distance: string, stroke: string, tokens: string[]) => {
        const need = expectedCount(distance, stroke);
        let arr = tokens.slice(0, need);
        if (need === 6) arr = [null as any].concat(arr);  // insere 10-11 vazio
        while (arr.length < 7) arr.push(null as any);
        return arr as (string | null)[];
    };

    const pushEvent = (gender: Gender, distanceNum: string, strokeRaw: string, tokens: string[]) => {
        const stroke = normStroke(strokeRaw);
        const distance = `${distanceNum}m`;
        const event = `${stroke} ${distance}`;
        const aligned = alignTo7(distanceNum, stroke, tokens);

        for (let i = 0; i < AGE_COLS.length; i++) {
            const label = AGE_COLS[i];
            const raw = aligned[i];
            const t = typeof (globalThis as any).normalizeTime === "function"
                ? (globalThis as any).normalizeTime(raw)
                : (raw ? String(raw) : null);

            if (label === "10-11") {
                structured.push({ gender, course, event, distance, stroke, age: "10", time: t });
                structured.push({ gender, course, event, distance, stroke, age: "11", time: t });
            } else {
                // "17+" já é o destino final
                structured.push({ gender, course, event, distance, stroke, age: label, time: t });
            }
        }
    };

    let pending: { distance: string; stroke: string; tokens: string[] } | null = null;

    const flushPending = () => {
        if (pending && gender) {
            pushEvent(gender, pending.distance, pending.stroke, pending.tokens);
        }
        pending = null;
    };

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (!raw) continue;

        const g = genderFrom(raw);
        if (g) { flushPending(); gender = g; continue; }

        if (!gender) continue;
        if (isMeta(raw)) continue;

        const m = EVENT_RX.exec(raw);
        if (m) {
            flushPending();
            const [, distNum, strokeRaw, tail = ""] = m;
            const distance = String(parseInt(distNum, 10));  // "50"..."1500"
            const stroke = normStroke(strokeRaw);
            const need = expectedCount(distance, stroke);
            let tokens = timesFrom(tail);

            if (tokens.length >= need) {
                pushEvent(gender, distance, stroke, tokens.slice(0, need));
            } else {
                pending = { distance, stroke, tokens: tokens.slice() };
            }
            continue;
        }

        if (pending && isPureTimes(raw)) {
            const distance = pending.distance;
            const stroke = normStroke(pending.stroke);
            const need = expectedCount(distance, stroke);
            pending.tokens.push(...timesFrom(raw));
            if (pending.tokens.length >= need) {
                pushEvent(gender, distance, stroke, pending.tokens.slice(0, need));
                pending = null;
            }
            continue;
        }

    }

    flushPending();
    return structured;
}

// Cornwall-County-Champs-2026-QTs
export function parseSwimmingPdfLayout10(text: string) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    type Gender = "female" | "male";
    type Course = "sc";
    const course: Course = "sc";

    const AGE_COLS = ["10-11", "12", "13", "14", "15", "16", "17+"] as const;

    const FEMALE_RX = /\bFEMALE\b/i;
    const MALE_RX = /\b(OPEN\s*\/\s*MALE|MALE\s*\/\s*OPEN|MALE|OPEN\/?MALE)\b/i;

    const EVENT_RX =
        /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|(?:Butterfly|Fly)|(?:Ind(?:ividual)?\.?\s*Medley|IM))\b(?:.*?\*)?\s*(.*)$/i;

    const TIME_TOKEN_RX =
        /(?:(?:\d{1,2}[:.]){2}\d{1,2})|(?:\d{1,2}[:.]\d{1,2}(?:[:.]\d{1,2})?)|(?:\d{1,2}[.]\d{1,2})/g;

    const STD_LINE_RX = /^(QT|CT)\b[:\-]?\s*(.*)$/i;

    const timesFrom = (s: string): string[] => s.match(TIME_TOKEN_RX) ?? [];

    const normStroke = (s: string) => {
        if (/^fly$/i.test(s) || /butterfly/i.test(s)) return "Butterfly";
        if (/^im$/i.test(s) || /ind(?:ividual)?\.?\s*medley/i.test(s)) return "Individual Medley";
        return s;
    };

    const normTime = (t: string | null) => {
        if (!t) return null;
        const s = t.trim();
        if (!s || /^n\/a$/i.test(s) || s === "—" || s === "-") return null;
        const fn = (globalThis as any).normalizeTime;
        return typeof fn === "function" ? fn(s) : s;
    };

    const needsLeftPadNull = (distance: string, stroke: string) =>
        distance === "800m" || distance === "1500m" || (distance === "400m" && /Individual Medley/i.test(stroke));

    const alignTo7 = (distance: string, stroke: string, tokens: string[]) => {
        let arr = tokens.slice(0, 7);
        if (needsLeftPadNull(distance, stroke) && tokens.length === 6) {
            arr = [null as any].concat(tokens).slice(0, 7);
        }
        while (arr.length < 7) arr.push(null as any);
        return arr as (string | null)[];
    };

    const pushAgeRows = (
        out: any[],
        gender: Gender,
        distance: string,
        stroke: string,
        standard: "qt" | "ct",
        tokens: string[]
    ) => {
        const event = `${stroke} ${distance}`;
        const aligned = alignTo7(distance, stroke, tokens);

        for (let i = 0; i < AGE_COLS.length; i++) {
            const label = AGE_COLS[i];
            const t = normTime(aligned[i]);

            if (label === "10-11") {
                out.push({ gender, course, event, distance, stroke, standard, age: "10", time: t });
                out.push({ gender, course, event, distance, stroke, standard, age: "11", time: t });
            } else {
                out.push({ gender, course, event, distance, stroke, standard, age: label, time: t });
            }
        }
    };

    const structured: any[] = [];
    let currentGender: Gender | null = null;

    let pending:
        | {
            distance: string;
            stroke: string;
            qt: string[] | null;
            ct: string[] | null;
        }
        | null = null;

    const flushPending = () => {
        if (!pending || !currentGender) { pending = null; return; }
        const { distance, stroke, qt, ct } = pending;

        if (qt && qt.length) pushAgeRows(structured, currentGender, distance, stroke, "qt", qt);
        if (ct && ct.length) pushAgeRows(structured, currentGender, distance, stroke, "ct", ct);

        pending = null;
    };

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (!raw) continue;

        if (FEMALE_RX.test(raw)) { flushPending(); currentGender = "female"; continue; }
        if (MALE_RX.test(raw)) { flushPending(); currentGender = "male"; continue; }

        if (!currentGender) continue; 

        const em = EVENT_RX.exec(raw);
        if (em) {
            flushPending();

            const dist = `${em[1]}m`;
            const stroke = normStroke(em[2]);
            const tail = (em[3] || "").trim();

            let qtInLine: string[] | null = null;
            let ctInLine: string[] | null = null;

            if (tail) {
                const parts = tail.split(/\s+/);
                const idxQT = parts.findIndex(p => /^QT$/i.test(p));
                const idxCT = parts.findIndex(p => /^CT$/i.test(p));
                if (idxQT >= 0) {
                    const after = parts.slice(idxQT + 1).join(" ");
                    const toks = timesFrom(after);
                    if (toks.length) qtInLine = toks;
                }
                if (idxCT >= 0) {
                    const after = parts.slice(idxCT + 1).join(" ");
                    const toks = timesFrom(after);
                    if (toks.length) ctInLine = toks;
                }
            }

            pending = { distance: dist, stroke, qt: qtInLine, ct: ctInLine };

            if (pending.qt && pending.ct) flushPending();
            continue;
        }

        if (pending) {
            const sm = STD_LINE_RX.exec(raw);
            if (sm) {
                const std = sm[1].toUpperCase() as "QT" | "CT";
                const toks = timesFrom(sm[2] || "");
                if (toks.length) {
                    if (std === "QT") pending.qt = toks;
                    else pending.ct = toks;
                }
                continue;
            }

            const pureTimes = timesFrom(raw);
            if (pureTimes.length) {
                if (!pending.qt) pending.qt = pureTimes;
                else if (!pending.ct) pending.ct = pureTimes;
                continue;
            }
        }
    }

    flushPending();
    return structured;
}

export function parseSwimmingPdfLayout11(text: string) {
    const raw = text.split("\n");
    const lines = raw.map(s => s.replace(/\s{2,}/g, " ").trim()).filter(Boolean);

    const AGES = ["10-11", "12", "13", "14", "15", "16", "17+"] as const;
    const course: "sc" = "sc";
    const used: boolean[] = new Array(lines.length).fill(false);

    const EVENT_RX = /^(\d{2,4})m\s+(Freestyle|Free|Backstroke|Back|Breaststroke|Breast|Butterfly|Fly|(?:Ind(?:ividual)?\.?\s*Medley|IM))\b(?:\s+(.*))?$/i;
    const TIMES_RX = /(?:(?:\d{1,2}[:.]){2}\d{1,2})|(?:\d{1,2}[:.]\d{1,2}(?:[:.]\d{1,2})?)|(?:\d{1,2}[.]\d{1,2})/g;

    const isPureTimes = (s: string) => {
        const t = s.match(TIMES_RX) || [];
        return t.length > 0 && t.join(" ") === s.replace(/\s+/g, " ");
    };
    const timesFrom = (s: string) => (s.match(TIMES_RX) || []);

    const normalizeStroke = (s: string) => {
        const x = s.toLowerCase();
        if (x.startsWith("ind") || x === "im") return "Individual Medley";
        if (x.startsWith("free")) return "Freestyle";
        if (x.startsWith("back")) return "Backstroke";
        if (x.startsWith("breast")) return "Breaststroke";
        if (x.startsWith("fly")) return "Butterfly";
        return s;
    };

    const needCount = (distance: string, stroke: string) => {
        const isIM = /Individual\s*Medley/i.test(stroke);
        if (distance === "800m" || distance === "1500m") return 6; // 12..17+
        if (distance === "400m" && isIM) return 6;                 // 12..17+
        return 7;                                                  // 10/11..17+
    };

    const alignTo7 = (distance: string, stroke: string, toks: string[]) => {
        const need = needCount(distance, stroke);   // 6 ou 7
        let arr = toks.slice(0, need);
        if (need === 6) arr = [null, ...arr];       //
        while (arr.length < 7) arr.push(null);
        return arr as (string | null)[];
    };

    const pushAgeRows = (out: any[], gender: "female" | "male", distanceNum: string, strokeRaw: string, tokens: string[]) => {
        const distance = `${distanceNum}m`;
        const stroke = normalizeStroke(strokeRaw);
        const event = `${stroke} ${distance}`;
        const aligned = alignTo7(distance, stroke, tokens);

        for (let i = 0; i < AGES.length; i++) {
            const label = AGES[i];
            const tt = normalizeTime(aligned[i]);
            if (label === "10-11") {
                out.push({ gender, course, event, distance, stroke, age: "10", time: tt });
                out.push({ gender, course, event, distance, stroke, age: "11", time: tt });
            } else {
                out.push({ gender, course, event, distance, stroke, age: label, time: tt });
            }
        }
    };

    const collectPrevTimes = (idxEvt: number, need: number) => {
        const tokens: string[] = [];
        let i = idxEvt - 1;
        while (i >= 0 && !used[i] && isPureTimes(lines[i]) && tokens.length < need) {
            tokens.unshift(...timesFrom(lines[i]));
            used[i] = true;
            i--;
        }
        return tokens.slice(0, need);
    };

    const collectNextTimes = (idxEvt: number, need: number, tailFirst: string[]) => {
        const tokens: string[] = [...tailFirst];
        let i = idxEvt + 1;
        while (i < lines.length && !used[i] && isPureTimes(lines[i]) && tokens.length < need) {
            tokens.push(...timesFrom(lines[i]));
            used[i] = true;
            i++;
        }
        return tokens.slice(0, need);
    };

    const out: any[] = [];

    for (let i = 0; i < lines.length; i++) {
        if (used[i]) continue;
        const line = lines[i];

        const m = EVENT_RX.exec(line);
        if (!m) continue;

        used[i] = true;

        const distNum = m[1];
        const strokeRaw = m[2];
        const tail = (m[3] || "").trim();

        const need = needCount(`${distNum}m`, normalizeStroke(strokeRaw));

        const maleTokens = collectPrevTimes(i, need);

        const tailTokens = timesFrom(tail);
        const femaleTokens = collectNextTimes(i, need, tailTokens);

        if (maleTokens.length > 0) {
            pushAgeRows(out, "male", distNum, strokeRaw, maleTokens);
        }
        if (femaleTokens.length > 0) {
            pushAgeRows(out, "female", distNum, strokeRaw, femaleTokens);
        }
    }

    return out;
}

// County-Championship-QTs-2025-1
export function parseSwimmingPdfLayout12(text: string) {
    const lines = text.split("\n").map(l => l.replace(/\s{2,}/g, " ").trim()).filter(Boolean);
    const AGES = ["10", "11", "12", "13", "14", "15", "16+"] as const;

    const EVENT_ANY_RX =
        /(\d{2,4})\s*m?\s+(Free(?:style)?|Back(?:stroke)?|Breast(?:stroke)?|Fly|Butterfly|I\.?M\.?|IM|Ind(?:ividual)?\.?\s*Medley)\b/i;
    const TIMES_RX =
        /(?:(?:\d{1,2}[:.]){2}\d{1,2})|(?:\d{1,2}[:.]\d{1,2}(?:[:.]\d{1,2})?)|(?:\d{1,2}[.]\d{1,2})/g;

    const isTimesOnly = (s: string) => {
        const t = s.match(TIMES_RX) || [];
        return t.length > 0 && t.join(" ") === s.replace(/\s+/g, " ");
    };
    const timesFrom = (s: string) => s.match(TIMES_RX) || [];

    const strokeCanonical = (s: string) => {
        if (/^free/i.test(s)) return "Freestyle";
        if (/^back/i.test(s)) return "Backstroke";
        if (/^breast/i.test(s)) return "Breaststroke";
        if (/^(fly|butterfly)/i.test(s)) return "Butterfly";
        return "Individual Medley";
    };

    const needByEvent = (distance: string, stroke: string) => {
        const d = distance.replace(/m$/i, "");
        const isIM = /individual medley/i.test(stroke);
        if (d === "800" || d === "1500") return 6;
        if (d === "400" && isIM) return 5;
        return 7;
    };

    const alignTo7 = (distance: string, stroke: string, tokens: string[]) => {
        const need = needByEvent(distance, stroke);
        const picked = tokens.slice(0, need);
        const out: (string | null)[] = Array(7).fill(null);
        if (need === 7) {
            for (let i = 0; i < 7; i++) out[i] = picked[i] ?? null;
        } else if (need === 6) {
            for (let i = 0; i < 6; i++) out[i + 2] = picked[i] ?? null;
        } else {
            for (let i = 0; i < 5; i++) out[i + 3] = picked[i] ?? null;
        }
        return out;
    };

    const isJunk = (s: string) =>
        /^(Produced by|Events|No event|All entries|Galaentries@|License numbers|Sussex County|Please be aware|Female Qualifying Times|Open\/Male Qualifying Times|Short course equivalent times)$/i.test(
            s
        ) ||
        /(Born|yrs|earlier)/i.test(s) ||
        /^\d{4}s?$/.test(s) ||
        /^201\d(?:\s*201\d)*$/.test(s);

    const out: any[] = [];
    let leftBuf: string[] = [];
    let eventsSeen = 0;
    const currentCourse = (): "lc" | "sc" => (eventsSeen < 17 ? "lc" : "sc");

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (!raw) continue;
        if (isJunk(raw)) continue;
        console.log("line", "line")

        const L = raw.replace(/\bI\.\s*M\.?/gi, "IM");
        const ev = EVENT_ANY_RX.exec(L);
        if (!ev) {
            if (isTimesOnly(L)) leftBuf.push(...timesFrom(L));
            continue;
        }

        const start = ev.index ?? L.indexOf(ev[0]);
        const before = L.slice(0, start).trim();
        const after = L.slice(start + ev[0].length).trim();

        const distNum = ev[1];
        const strokeRaw = ev[2];
        const stroke = strokeCanonical(strokeRaw);
        const distance = `${parseInt(distNum, 10)}m`;
        const need = needByEvent(distance, stroke);
        const course = currentCourse();

        let left = [...leftBuf, ...timesFrom(before)];
        let right = timesFrom(after);

        let j = i + 1;
        while (right.length < need && j < lines.length && isTimesOnly(lines[j].replace(/\bI\.\s*M\.?/gi, "IM"))) {
            right.push(...timesFrom(lines[j].replace(/\bI\.\s*M\.?/gi, "IM")));
            j++;
        }

        left = left.slice(0, need);
        right = right.slice(0, need);

        const leftAligned = alignTo7(distance, stroke, left);
        const rightAligned = alignTo7(distance, stroke, right);

        for (let k = 0; k < AGES.length; k++) {
            out.push({
                gender: "male",
                course,
                event: `${stroke} ${distance}`,
                distance,
                stroke,
                age: AGES[k],
                time: normalizeTime(leftAligned[k]),
            });
        }
        for (let k = 0; k < AGES.length; k++) {
            out.push({
                gender: "female",
                course,
                event: `${stroke} ${distance}`,
                distance,
                stroke,
                age: AGES[k],
                time: normalizeTime(rightAligned[k]),
            });
        }

        eventsSeen += 1;
        i = j - 1;
        leftBuf = [];
    }

    return out;
}


function fixRawTime(value: string | number): string {
    if (typeof value === "string") {
        // case 1: multiple dots like "2.48.10" → "00:02:48"
        if ((value.match(/\./g) || []).length >= 2) {
            const parts = value.split(".");
            const minutes = parts[0].padStart(2, "0");
            const seconds = parts[1].padStart(2, "0");
            return `00:${minutes}:${seconds}`;
        }

        // case 2: concatenated MMSS.s like "0140.8" → "00:01:40"
        const match = value.match(/^0?(\d+)(\d{2})(?:\.(\d+))?$/);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            return `00:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        }

        // fallback: keep original string
        return value;
    }

    // numbers: treat as Excel fraction or minutes
    if (typeof value === "number") {
        if (value > 0 && value < 1) {
            const totalSeconds = Math.round(value * 24 * 60 * 60);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
                .toString()
                .padStart(2, "0")}`;
        }
        if (value >= 1) {
            const minutes = Math.floor(value / 60);
            const seconds = Math.round(value % 60);
            return `00:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
    }

    return "";
}

function normalizeTime(t: string | null): string | null {
    if (!t) return null;
    t = t.replace(',', '.').trim();

    // Case mm:ss (no decimals) → convert to mm.ss
    if (/^\d{1,2}:\d{2}$/.test(t)) {
        const [m, s] = t.split(':');
        return `${parseInt(m, 10)}.${s}`;
    }

    // Case m.ss.xx → convert to hh:mm:ss (drop hundredths)
    if (/^\d+\.\d+\.\d+$/.test(t)) {
        const parts = t.split('.');
        const minutes = String(parseInt(parts[0], 10)).padStart(2, '0');
        const seconds = String(parseInt(parts[1], 10)).padStart(2, '0');
        return `00:${minutes}:${seconds}`;
    }

    // Case mm:ss.xx → convert to hh:mm:ss
    if (/^\d{1,2}:\d{2}\.\d+$/.test(t)) {
        const [m, sRaw] = t.split(':');
        const seconds = Math.floor(parseFloat(sRaw)).toString().padStart(2, '0');
        const minutes = String(parseInt(m, 10)).padStart(2, '0');
        return `00:${minutes}:${seconds}`;
    }

    // Case hh:mm:ss → normalize just in case
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) {
        const [h, m, s] = t.split(':');
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;
    }

    return t;
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



