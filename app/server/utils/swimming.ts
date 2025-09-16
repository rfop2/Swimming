// 2025-SECC-Qualifying-Times_updated-Nov-2024_-final
// Layout first line of table female male
// second life age 'event age
// third line times eventName times
export function parseSwimmingPdf(text: string) {
    const ages = ["10-11", "12", "13", "14", "15", "16", "17+"]

    const rawLines = text.split("\n").map(l => l.trim()).filter(Boolean)

    const events: any[] = []

    const isTime = (t: string) => /^\d+(?:\.\d+){1,2}$/.test(t)
    const isDistance = (t: string) => /^(50|100|200|400|800|1500)$/.test(t)
    const isStrokeWord = (w: string) =>
        ['Freestyle', 'Breaststroke', 'Butterfly', 'Backstroke', 'IM'].includes(w)

    const mergedLines: string[] = []
    let buf: string[] = []
    let seenAnchor = false           // have we seen "<distance> <stroke>" in this buffer?
    let postAnchorTimes = 0          // how many times collected after the anchor (male)

    for (const line of rawLines) {
        const parts = line.split(/\s+/).filter(Boolean)
        for (let i = 0; i < parts.length; i++) {
            const tok = parts[i]
            const nxt = parts[i + 1]

            const isAnchor = isDistance(tok) && isStrokeWord(nxt)

            if (isAnchor) {
                if (buf.length) {
                    mergedLines.push(buf.join(' '))
                    buf = []
                }
                buf.push(tok, nxt)
                seenAnchor = true
                postAnchorTimes = 0
                i++ // consumiu o stroke
                continue
            }

            buf.push(tok)

            // count only times AFTER the anchor (male side)
            if (seenAnchor && isTime(tok)) {
                postAnchorTimes++
            }

            // 🚨 se já temos 7 tempos OU se o próximo token é um novo evento, encerra
            if (seenAnchor && (postAnchorTimes === ages.length || isAnchor)) {
                mergedLines.push(buf.join(' '))
                buf = []
                seenAnchor = false
                postAnchorTimes = 0
            }
        }
    }
    // flush leftovers (e.g., last event)
    if (buf.length) mergedLines.push(buf.join(' '))


    // Main parser now runs over mergedLines instead of raw lines
    for (let lineIndex = 0; lineIndex < mergedLines.length; lineIndex++) {
        const line = mergedLines[lineIndex]
        const parts = line.split(/\s+/)
        let i = 0
        while (i < parts.length) {
            const femaleTimes: string[] = []
            const maleTimes: string[] = []
            const words: string[] = []

            // 1. Capture female times
            while (i < parts.length && femaleTimes.length < ages.length && isTime(parts[i])) {
                femaleTimes.push(parts[i])
                i++
            }

            // 2. Capture words of the event
            while (i < parts.length && !isTime(parts[i])) {
                words.push(parts[i])
                i++
            }

            const eventName = words.join(" ").trim()
            const stroke = eventName.split(" ").slice(-1)[0] // last word as stroke
            const distanceMatch = eventName.split(" ").slice(0, 1)[0] // first word as distance

            const isDistance = (t: string) => /^(50|100|200|400|800|1500)$/.test(t)
            const isStrokeWord = (w: string) =>
                ['Freestyle', 'Breaststroke', 'Butterfly', 'Backstroke', 'IM'].includes(w)


            // 3. Capture male times from the current line
            while (i < parts.length && maleTimes.length < ages.length) {
                // se detectarmos início de um novo evento, paramos
                if (isDistance(parts[i]) && isStrokeWord(parts[i + 1])) break

                if (isTime(parts[i])) {
                    maleTimes.push(parts[i])
                }

                i++
            }


            // Substitua o seu while 3b por:
            let nextLineIndex = lineIndex + 1
            while (maleTimes.length < ages.length && nextLineIndex < mergedLines.length) {
                const nextParts = mergedLines[nextLineIndex].split(/\s+/)
                // se a próxima linha começa um novo evento, pare
                if (nextParts.some((p, idx) => isDistance(p) && isStrokeWord(nextParts[idx + 1]))) break
                for (const p of nextParts) {
                    if (isTime(p) && maleTimes.length < ages.length) maleTimes.push(p)
                    else if (isDistance(p)) break
                }
                nextLineIndex++
            }

            const padLeft = (arr: (string | null)[], size: number) => {
                const missing = Math.max(size - arr.length, 0)
                return Array(missing).fill(null).concat(arr).slice(-size)
            }

            // Only push events if there is a valid name and at least 10 total times
            if (eventName && (femaleTimes.length + maleTimes.length) >= 10) {
                const femaleAligned = padLeft(femaleTimes, ages.length)
                const maleAligned = padLeft(maleTimes, ages.length)

                events.push({
                    stroke: stroke,
                    distance: distanceMatch,
                    event: eventName,
                    female: ages.map((age, i) => ({ age, time: femaleAligned[i] })),
                    male: ages.map((age, i) => ({ age, time: maleAligned[i] })),
                })
            }
        }
    }

    return events
}

// 2026 Qualifying times
export function parseSwimmingPdfLayout2(text: string) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    // idades do PDF
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
            let  stroke = parts[1];

            if (stroke === "IM" || stroke === "Medley") {
                stroke = "Individual Medley";
            }

            let times = parts.slice(2);

            // preencher com null se faltar algum tempo
            if (times.length < ages.length) {
                times = Array(ages.length - times.length).fill(null).concat(times);
            }

            // criar entradas normalizadas
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
        // Detecta gênero
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
            parts.splice(0, 2); // remove stroke da linha
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

    return events;
}