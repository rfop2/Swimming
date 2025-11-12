import * as XLSX from "xlsx"

// some functions doesn't have course because is selected by the user
interface ImportEvent {
  gender: "male" | "female" | null
  age: string | number
  course?: "lc" | "sc" | null
  distance: string
  stroke: string | null
  event: string
  time: string | null
}

type Gender = "male" | "female"

// For layout 3 (it builds an intermediate structure before normalization)
interface AgeTime {
  age: string
  time: string | null
}
interface Layout3Event {
  gender: Gender | null
  event: string
  distance: string
  stroke: string
  times: AgeTime[]
}

// 2025-SECC-Qualifying-Times_updated-Nov-2024_-final
export function parseSwimmingPdf(text: string) {
  const ages = ["10 & 11", "12", "13", "14", "15", "16", "17+"]
  const isStrokeWord = (w: string) =>
    ["Freestyle", "Breaststroke", "Butterfly", "Backstroke", "IM"].includes(w)

  const rawLines = text.split("\n").map(l => l.trim()).filter(Boolean)
  const events: ImportEvent[] = []

  const pushEvent = (distance: string, stroke: string, femaleRaw: string[], maleRaw: string[]) => {
    const eventName = `${distance} ${stroke}`

    const femaleTimes = Array(ages.length - femaleRaw.length).fill(null).concat(femaleRaw)
    const maleTimes = Array(ages.length - maleRaw.length).fill(null).concat(maleRaw)

    ages.forEach((age, idx) => {
      const femaleTime = femaleTimes[idx] ?? null
      const maleTime = maleTimes[idx] ?? null

      if (age === "10 & 11") {
        [10, 11].forEach(a => {
          events.push({ gender: "female", age: a, distance, stroke, event: eventName, time: normalizeTime(femaleTime) })
          events.push({ gender: "male", age: a, distance, stroke, event: eventName, time: normalizeTime(maleTime) })
        })
      } else {
        events.push({ gender: "female", age, distance, stroke, event: eventName, time: normalizeTime(femaleTime) })
        events.push({ gender: "male", age, distance, stroke, event: eventName, time: normalizeTime(maleTime) })
      }
    })
  }

  const isTime = (t: string) => /\d+\.\d/.test(t)

  for (let i = 0; i < rawLines.length; i++) {
    const parts = rawLines[i].split(/\s+/).filter(Boolean)
    if (!parts.length) continue

    const anchorIdx = parts.findIndex((p, idx) =>
      /^\d{2,4}$/.test(p) && isStrokeWord(parts[idx + 1])
    )
    if (anchorIdx === -1) continue

    const distance = parts[anchorIdx]
    let stroke = parts[anchorIdx + 1]
    if (stroke === "IM") stroke = "Individual Medley"

    const leftTokens = parts.slice(0, anchorIdx)
    const rightTokens = parts.slice(anchorIdx + 2)

    // sepcial case: Breaststroke
    if (stroke === "Breaststroke" && leftTokens.length === 0 && i > 0) {
      const prevParts = rawLines[i - 1].split(/\s+/).filter(Boolean)
      const femaleTokens = prevParts.filter(isTime)

      let maleTokens = rightTokens.filter(isTime)
      let j = i + 1
      while (maleTokens.length < ages.length && j < rawLines.length) {
        const nextParts = rawLines[j].split(/\s+/).filter(Boolean)
        const nextAnchorIdx = nextParts.findIndex((p, idx) =>
          /^\d{2,4}$/.test(p) && isStrokeWord(nextParts[idx + 1])
        )
        if (nextAnchorIdx !== -1) break
        maleTokens = maleTokens.concat(nextParts.filter(isTime))
        j++
      }

      pushEvent(distance + "m", "Breaststroke", femaleTokens, maleTokens.slice(0, ages.length))
      i = j - 1
      continue
    }

    const femaleRaw = leftTokens.filter(isTime)
    const maleRaw = rightTokens.filter(isTime)
    pushEvent(distance + "m", stroke, femaleRaw, maleRaw)
  }

  return events
}

// 2026 Qualifying times
export function parseSwimmingPdfLayout2(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  const ages = ["10 & 11", "12", "13", "14", "15", "16", "17/OV"]

  const structured = []
  let currentGender: string | null = null

  for (const line of lines) {
    // detect gender
    if (/Mens\/Open/i.test(line)) {
      currentGender = "male"
      continue
    }
    if (/Female/i.test(line)) {
      currentGender = "female"
      continue
    }

    if (/^EVENT\b/i.test(line)) continue // ignore headers

    if (/^\d{2,4}m/i.test(line)) {
      const parts = line.split(/\s+/)
      const event = parts[0] + " " + parts[1]
      const distance = parts[0]
      let stroke = parts[1]

      if (stroke === "IM" || stroke === "Medley") {
        stroke = "Individual Medley"
      }

      let times = parts.slice(2)

      if (times.length < ages.length) {
        times = Array(ages.length - times.length).fill(null).concat(times)
      }

      ages.forEach((ageLabel, idx) => {
        let time = times[idx] || null
        time = normalizeTime(time)

        if (ageLabel === "10 & 11") {
          structured.push({ gender: currentGender, event, distance, stroke, age: "10", time })
          structured.push({ gender: currentGender, event, distance, stroke, age: "11", time })
        } else if (ageLabel === "17/OV") {
          structured.push({ gender: currentGender, event, distance, stroke, age: "17+", time })
        } else {
          structured.push({ gender: currentGender, event, distance, stroke, age: ageLabel, time })
        }
      })
    }
  }

  return structured
}

// 2025-Dorset-County-ASA-Championships-Entry-Information-Iss-4-071124
export function parseSwimmingPdfLayout3(text: string) {
  const ages = ["10/11", "12", "13", "14", "15", "16", "17/OV"]
  const rawLines = text.split("\n").map(l => l.trim()).filter(Boolean)

  const events: Layout3Event[] = []
  let currentGender: "male" | "female" | null = null
  let currentStroke: string | null = null

  const strokes = ["FREESTYLE", "BREASTSTROKE", "BUTTERFLY", "BACKSTROKE", "IND MEDLEY"]

  // times like 43.38, 1:34.75 ou 1.34.75
  const isTime = (t: string) => /^\d+(?:\.\d+){1,2}$/.test(t)

  for (const line of rawLines) {
    if (/\bFEMALE\b/i.test(line)) {
      currentGender = "female"
      continue
    }

    if (/\bMALE\b/i.test(line) || /\bMALE\b/i.test(line)) {
      currentGender = "male"
      continue
    }

    // ignore headers
    if (/^(?:DORSET|CONSIDERATION|φτφ|^\d{1,2}$)/i.test(line)) continue

    const parts = line.split(/\s+/)

    // stroke detection
    const firstTwo = parts.slice(0, 2).join(" ").toUpperCase()
    const firstOne = parts[0].toUpperCase()

    if (strokes.includes(firstTwo)) {
      currentStroke = firstTwo
      parts.splice(0, 2) // remove stroke
    } else if (strokes.includes(firstOne)) {
      currentStroke = firstOne
      parts.splice(0, 1)
    }

    // Distance (50m, 100m, 200m, etc.)
    const distanceIdx = parts.findIndex(p => /^\d{1,4}m$/i.test(p.replace(/\s+/g, "")))
    if (distanceIdx === -1) continue

    const distance = parts[distanceIdx].replace(/\s+/g, "")
    const timesRaw = parts.slice(distanceIdx + 1).map(t => (isTime(t) ? t : null))

    // Check for nulls
    const missing = Math.max(0, ages.length - timesRaw.length)
    const filledTimes = [...timesRaw, ...Array(missing).fill(null)].slice(0, ages.length)

    events.push({
      gender: currentGender,
      event: `${distance} ${currentStroke}`,
      distance,
      stroke: currentStroke,
      times: ages.map((age, idx) => ({ age, time: filledTimes[idx] }))
    })
  }

  return normalizeLayout3(events)
}

export function normalizeLayout3(events: Layout3Event[]): ImportEvent[] {
  const normalized: ImportEvent[] = []

  events.forEach(event => {
    let stroke = event.stroke

    if (stroke === "IM" || stroke === "Medley" || stroke === "IND MEDLEY") {
      stroke = "Individual Medley"
    }

    if (stroke === "FREESTYLE") {
      stroke = "Freestyle"
    }

    if (stroke === "BREASTSTROKE") {
      stroke = "Breaststroke"
    }

    if (stroke === "BUTTERFLY") {
      stroke = "Butterfly"
    }

    if (stroke === "BACKSTROKE") {
      stroke = "Backstroke"
    }

    event.times.forEach((t: { age: string, time: string | null }) => {
      const age = t.age
      if (age === "10/11" || age === "10 & 11") {
        normalized.push({
          gender: event.gender,
          event: event.event,
          distance: event.distance,
          stroke: stroke,
          age: "10",
          time: normalizeTime(t.time)
        })
        normalized.push({
          gender: event.gender,
          event: event.event,
          distance: event.distance,
          stroke: stroke,
          age: "11",
          time: normalizeTime(t.time)
        })
      } else if (age === "17/OV") {
        normalized.push({
          gender: event.gender,
          event: event.event,
          distance: event.distance,
          stroke: stroke,
          age: "17+",
          time: normalizeTime(t.time)
        })
      } else {
        normalized.push({
          gender: event.gender,
          event: event.event,
          distance: event.distance,
          stroke: stroke,
          age,
          time: normalizeTime(t.time)
        })
      }
    })
  })

  return normalized
}

// 2025-Devon-Championship-Qualifying-Times-V3
export function parseSwimmingXlsx(buffer: ArrayBuffer | Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // read all rows as array of arrays
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false })

  const ages = ["10yrs", "11yrs", "12yrs", "13yrs", "14yrs", "15yrs", "16yrs", "17/ov"]
  const events: ImportEvent[] = []
  let currentDistance = ""
  let currentStroke = ""

  const headersToIgnore = ["DEVON", "DORSET", "CONSIDERATION", "Entry times", "Ages as at", "Open / Male"]

  for (let row of rows) {
    row = row.map((cell) => (cell ? cell.toString().trim() : ""))

    const middleCells = row.slice(1, row.length - 1)

    if (!row.some((cell) => cell)) continue

    const rowStr = row.map((cell) => cell.replace(/\s+/g, " ").trim()).join(" ")

    if (headersToIgnore.some((h) => rowStr.toUpperCase().includes(h.toUpperCase()))) continue
    if (row.every((cell) => ages.includes(cell))) continue

    const distanceStrokeCell = middleCells.find((cell) => /\d{2,3}m/.test(cell) && /[A-Za-z]/.test(cell))
    if (distanceStrokeCell) {
      const parts = distanceStrokeCell.split(" ")
      currentDistance = parts[0]
      currentStroke = parts.slice(1).join(" ")
      if (["IM", "Medley", "Ind Medley"].includes(currentStroke)) currentStroke = "Individual Medley"
      continue
    }

    const numericCells = Array.from(row.slice(1, row.length - 1), (cell) => {
      if (!cell) return null
      const fixed = fixRawTime(cell)
      return normalizeTime(fixed)
    })

    const maleTimes = numericCells.slice(0, 8).map((t) => (t === null ? null : t))
    const femaleTimes = numericCells.slice(9, 17).map((t) => (t === null ? null : t))

    ages.forEach((age, idx) => {
      events.push({
        gender: "male",
        age: normalizeAge(age),
        distance: currentDistance,
        stroke: currentStroke,
        event: `${currentDistance} ${currentStroke}`,
        time: maleTimes[idx] || null,
      })
      events.push({
        gender: "female",
        age: normalizeAge(age),
        distance: currentDistance,
        stroke: currentStroke,
        event: `${currentDistance} ${currentStroke}`,
        time: femaleTimes[idx] || null,
      })
    })
  }

  return events
}

// 2025-hcasa-champs-qts-v2
export function parseSwimmingPdfLayout4(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  const ages = ["10-11", "12", "13", "14", "15", "16", "17"]
  const strokes = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM"]

  const structured: ImportEvent[] = []
  let currentCourse: "lc" | "sc" | null = null
  let currentGender: "male" | "female" | null = null


  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    let line = lines[lineIndex]
    // Detect course
    if (/Qualifying Times.*LONG COURSE/i.test(line)) {
      currentCourse = "lc"
      continue
    }
    if (/Qualifying Times.*SHORT COURSE/i.test(line)) {
      currentCourse = "sc"
      continue
    }

    if (lineIndex < 39) {
      currentGender = "female"
    } else {
      currentGender = "male"
    }

    // Ignore headers
    if (
      /Automatic Times/i.test(line)
      || /Consideration Times/i.test(line)
      || /Stroke\s*Distance/i.test(line)
    ) {
      continue
    }

    let matchedStroke: string | null = null
    let distance: string | undefined = undefined

    for (const stroke of strokes) {
      const strokeIndex = line.indexOf(stroke)
      if (strokeIndex === -1) continue

      matchedStroke = stroke

      const timesPart = line.slice(0, strokeIndex).trim()
      const afterStroke = line.slice(strokeIndex + stroke.length)

      const m = afterStroke.match(/^\s*(50|100|200|400|800|1500)\b/)
      if (!m) {
        matchedStroke = null
        continue
      }

      distance = m[1]
      line = `${timesPart} ${stroke} ${distance}`
      break
    }

    if (!matchedStroke || !distance) continue

    line = line.replace(/n\/a(?=\d)/gi, "n/a ")

    const event = `${matchedStroke} ${distance}m`

    const timesRaw = line.split(`${matchedStroke} ${distance}`)[0].trim().split(/\s+/).filter(Boolean)

    matchedStroke = matchedStroke === "IM" ? "Individual Medley" : matchedStroke

    const times = timesRaw.length < ages.length
      ? Array(ages.length - timesRaw.length).fill(null).concat(timesRaw)
      : timesRaw
    for (let idx = 0; idx < ages.length; idx++) {
      const ageLabel = ages[idx]
      const rawTime = times[idx] ?? null
      let time = rawTime && rawTime.toLowerCase() !== "n/a" ? rawTime : null
      time = normalizeTime(time)

      if (ageLabel === "10-11") {
        structured.push({ gender: currentGender, course: currentCourse, event, distance: distance + "m", stroke: matchedStroke, age: "10", time })
        structured.push({ gender: currentGender, course: currentCourse, event, distance: distance + "m", stroke: matchedStroke, age: "11", time })
      } else if (ageLabel === "17") {
        structured.push({ gender: currentGender, course: currentCourse, event, distance: distance + "m", stroke: matchedStroke, age: "17+", time })
      } else {
        structured.push({ gender: currentGender, course: currentCourse, event, distance: distance + "m", stroke: matchedStroke, age: ageLabel, time })
      }
    }
  }

  return structured
}

// 2025-qualifying-times_079840
// only Accepted (Lower) times
export function parseSwimmingPdfLayout5(text: string) {
  const lines = text.split("\n");
  console.log("[L5] total lines:", lines.length);

  const AGE_COLS = ["10-11", "12", "13", "14", "15", "16", "17"];
  const course = "sc" as const;
  const structured: ImportEvent[] = [];

  let gender: "female" | "male" | null = null;

  // e.g. "200m Individual Medley ..." or "50m Freestyle ..."
  const EVENT_RX =
    /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Individual\s+Medley)(?:\s+(.*))?$/i;

  // Accept "1:07.22", "00:36.68", "59.66" (no colon), or "05:09.93"
  const TIME_RX = /^(?:(?:\d{1,2}:)?\d{2}|\d{1,2})(?:\.\d{2})?$/;

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
    /^\(?Under/i.test(s) ||
    /^--\s*\d+\s*of\s*\d+\s*--$/i;

  const whyMeta = (s: string) => {
    if (/\bAccepted\b/i.test(s)) return "Accepted";
    if (/\bConsidered\b/i.test(s)) return "Considered";
    if (/SHORT\s*COURSE/i.test(s)) return "SHORT COURSE";
    if (/^Ages are/i.test(s)) return "Ages";
    if (/^v\d/i.test(s)) return "Version";
    if (/^County/i.test(s)) return "County";
    if (/^OXFORDSHIRE/i.test(s)) return "OXFORDSHIRE";
    if (/^Affiliated/i.test(s)) return "Affiliated";
    if (/^\(?Under/i.test(s)) return "Under";
    if (/^--\s*\d+\s*of\s*\d+\s*--$/i.test(s)) return "Page marker";
    if (/\bYears\b/i.test(s)) return "Years";
    return "Other meta";
  };

  // ---------- YOUR SNIPPET (adapted) ----------
  // Detect if it's an age-columns header
  const isYearsHeader = (line: string) =>
    /\b(10\/11\s*Years|12\s*Years|13\s*Years|14\s*Years|15\s*Years|16\s*Years|17\+\s*Years)\b/i.test(line);

  // Extract gender from the header
  function getGenderFromHeader(line: string): "female" | "male" | null {
    const s = line.toUpperCase();

    // Female first
    if (/\b(FEMALE|WOMEN|GIRLS)\b/.test(s)) return "female";

    // Male (covers "OPEN/MALE" and variants)
    if (/\b(OPEN\/MALE|MALE\/OPEN|MALE|MEN|BOYS)\b/.test(s)) return "male";

    return null; // undefined
  }
  // -------------------------------------------

  const timesFrom = (s: string) => s.split(/\s+/).filter((t) => TIME_RX.test(t) || /^n\/a$/i.test(t));

  const normalize = (t: string | null) => {
    if (!t) return null;
    const s = t.trim();
    if (!s || /^n\/a$/i.test(s)) return null;
    return typeof normalizeTime === "function" ? normalizeTime(s) : s;
  };

  const expectedCount = (distance: string, stroke: string) => {
    if (distance === "800m" || distance === "1500m") return 6; // no 10/11
    if (distance === "400m" && /Individual\s+Medley/i.test(stroke)) return 6; // 400 IM
    return 7;
  };

  const pushRow = (distance: string, stroke: string, acceptedTimes: (string | null)[]) => {
    let aligned: (string | null)[];
    if (acceptedTimes.length >= 7) aligned = acceptedTimes.slice(0, 7);
    else if (acceptedTimes.length === 6) aligned = [null, ...acceptedTimes]; // missing 10/11
    else aligned = Array(7 - acceptedTimes.length).fill(null).concat(acceptedTimes);

    const event = `${stroke} ${distance}`;
    console.log(`[pushRow] ${event} | accepted=${acceptedTimes.length} -> aligned=${aligned.length}`);

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

  const finalizePending = (reason: string) => {
    if (!pending) {
      return;
    }

    if (!gender) {
      pending = null;
      return;
    }

    const N = expectedCount(pending.distance, pending.stroke);
    let accepted: string[];
    if (pending.inline) {
      accepted =
        pending.tokens.length >= N * 2
          ? pending.tokens.filter((_, i) => i % 2 === 0).slice(0, N)
          : pending.tokens.slice(0, N);
    } else {
      accepted = pending.tokens.slice(0, N);
    }

    pushRow(pending.distance, pending.stroke, accepted);
    pending = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    console.log(`[${i}] RAW:`, raw);
    const line = raw.replace(/\s{2,}/g, " ").trim();
    console.log(`[isMeta-debug] line="${line}"`, {
      Years: /\bYears\b/i.test(line),
      Accepted: /\bAccepted\b/i.test(line),
      Considered: /\bConsidered\b/i.test(line),
      ShortCourse: /SHORT\s*COURSE/i.test(line),
      Ages: /^Ages are/i.test(line),
      Version: /^v\d/i.test(line),
      County: /^County/i.test(line),
      OX: /^OXFORDSHIRE/i.test(line),
      Aff: /^Affiliated/i.test(line),
      Under: /^\(?Under/i.test(line),
      Page: /^--\s*\d+\s*of\s*\d+\s*--$/i.test(line),
    });

    if (!line) {
      console.log(`[${i}] empty -> skip`);
      continue;
    }

    // 1) DETECT EVENT FIRST (before any meta filters)
    const m = EVENT_RX.exec(line);
    console.log(
      `[${i}] EVENT_RX match?`,
      !!m,
      m ? { distance: m[1], stroke: m[2], tailPreview: (m[3] || "").slice(0, 50) } : null
    );

    if (m) {
      if (!gender) {
        gender = "female"; // default if not set yet
      }
      finalizePending("new event");

      const distance = `${m[1]}m`;
      const stroke = m[2].replace(/\s+/g, " ") === "Individual Medley" ? "Individual Medley" : m[2];
      const inlineTokens = m[3] ? timesFrom(m[3]) : [];
      if (inlineTokens.length) console.log(`[${i}] inlineTokens:`, inlineTokens);

      pending = { distance, stroke, tokens: inlineTokens, inline: inlineTokens.length > 0 };
      if (pending.inline) finalizePending("inline event (immediate)");
      continue; // do not fall-through
    }

    // 1.5) YEARS HEADER / GENDER FROM HEADER (must be BEFORE gender blocks and BEFORE isMeta)
    if (isYearsHeader(line)) {
      const newGender = getGenderFromHeader(line);
      if (newGender) {
        if (gender && gender !== newGender) {
          finalizePending("gender switch -> YEARS header");
        }
        gender = newGender;
      } else {
      }
      continue;
    }

    // 2) THEN other headers/meta that switch gender
    if (/^FEMALE$/i.test(line)) {
      finalizePending("gender switch -> FEMALE");
      gender = "female";
      continue;
    }
    if (/^(OPEN\s*\/\s*MALE|MALE\s*\/\s*OPEN|OPEN\/MALE|MALE\/OPEN|OPEN|MALE)$/i.test(line)) {
      finalizePending("gender switch -> MALE");
      gender = "male";
      continue;
    }

    // 2.5) META (keep AFTER years-header so it doesn't swallow the header)
    if (isMeta(line)) {
      continue;
    }

    // 3) Pure time lines extending the previous event
    if (pending) {
      const tokens = timesFrom(line);
      const only = tokens.length > 0 && tokens.every((t) => TIME_RX.test(t) || /^n\/a$/i.test(t));
      if (only) {
        pending.tokens.push(...tokens);
        continue;
      }
    }

  }

  finalizePending("end of file");

  return structured;
}


// 2026-CQTs
export function parseSwimmingPdfLayout6(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  const AGES8 = ["10-11", "12", "13", "14", "15", "16", "17", "18+"]
  const structured: ImportEvent[] = []

  let gender: "female" | "male" | null = null
  let eventHeaderCount = 0

  const EVENT_RX = /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Individual\s*Medley)\s*(.*)$/i
  // capta "38.00", "1:28.00", "1.28.00", "05:16.00", "3.27.00" etc.
  const TIME_TOKEN_RX = /(?:(?:\d{1,2}[:.]){2}\d{2})|(?:\d{1,2}[:.]\d{2})/g

  const isEventHeader = (s: string) => /^EVENT\s*10\/?11/i.test(s.replace(/\s+/g, ""))
  const isMeta = (s: string) =>
    /Qualifying Times/i.test(s)
    || /Somerset ASA/i.test(s)
    || /FEMALE\s*2026/i.test(s)
    || /OPEN\s*\/\s*MALE\s*2026/i.test(s)
    || /^\.?$/.test(s)

  const extractTimes = (s: string): string[] => s.match(TIME_TOKEN_RX) ?? []

  const expectedCount = (distance: string, stroke: string) => {
    const isIM = /Individual\s*Medley/i.test(stroke)
    if (distance === "800m" || distance === "1500m") return 7
    if (distance === "400m" && isIM) return 7
    return 8
  }

  const alignTo8 = (times: (string | null)[], distance: string, stroke: string) => {
    const need = expectedCount(distance, stroke)
    let arr = times.slice(0, need)

    if (need === 7) {
      arr = [null, ...arr]
    }

    if (arr.length < 8) arr = arr.concat(Array(8 - arr.length).fill(null))

    // garante 8 posições
    return arr.slice(0, 8)
  }

  const pushStructured = (distance: string, stroke: string, times: string[]) => {
    const event = `${stroke} ${distance}`
    const aligned8 = alignTo8(times, distance, stroke) // 8 pos

    for (let i = 0; i < AGES8.length; i++) {
      const label = AGES8[i]
      const raw = aligned8[i] ?? null
      const t = normalizeTime(raw)

      if (label === "10-11") {
        structured.push({ gender, event, distance, stroke, age: "10", time: t })
        structured.push({ gender, event, distance, stroke, age: "11", time: t })
      } else {
        structured.push({ gender, event, distance, stroke, age: label, time: t })
      }
    }
  }

  for (const raw of lines) {
    if (!raw) continue

    if (isEventHeader(raw)) {
      eventHeaderCount += 1
      gender = eventHeaderCount === 1 ? "female" : "male"
      continue
    }

    if (!gender) continue
    if (isMeta(raw)) continue

    const m = EVENT_RX.exec(raw)
    if (!m) continue

    const distance = `${m[1]}m`
    const stroke = /Individual\s*Medley/i.test(m[2]) ? "Individual Medley" : m[2]
    const tail = m[3] || ""

    const times = extractTimes(tail)
    if (times.length === 0) continue

    pushStructured(distance, stroke, times)
  }

  return structured
}

// bsbasa-2025-consideration-times_051436
export function parseSwimmingPdfLayout7(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  console.log("[L7] total lines:", lines.length)

  const AGES = ["10-11", "12", "13", "14", "15", "16", "17+"] as const
  const structured: ImportEvent[] = []

  let gender: "female" | "male" | null = null

  // Allow optional tail after the event (inline times)
  const EVENT_RX =
    /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|(?:Ind(?:ividual)?\.?\s*Medley|IM))(?:\s+(.*))?$/i

  // Used only to detect that a new event line started (no need to capture tail)
  const EVENT_PREFIX_RX =
    /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|(?:Ind(?:ividual)?\.?\s*Medley|IM))\b/i

  const TIME_TOKEN_RX = /\d{1,2}(?:[:.]\d{1,2}){1,2}/g

  const expectedCols = (distance: string, stroke: string) => {
    const isIM = /Ind(?:ividual)?\.?\s*Medley|IM/i.test(stroke)
    if (distance === "800m" || distance === "1500m") return 6 // 12..17+
    if (distance === "400m" && isIM) return 6                // 400 IM -> 12..17+
    return 7                                                 // 10/11..17+
  }

  const alignTo7 = (distance: string, stroke: string, times: string[]) => {
    const need = expectedCols(distance, stroke) // 6 or 7
    const arr: (string | null)[] = times.slice(0, need)
    if (need === 6) arr.unshift(null) // pad missing 10/11
    while (arr.length < 7) arr.push(null)
    return arr as (string | null)[]
  }

  const pushRows = (distance: string, strokeRaw: string, tokens: string[]) => {
    const stroke = /Ind(?:ividual)?\.?\s*Medley|IM/i.test(strokeRaw) ? "Individual Medley" : strokeRaw
    const event = `${stroke} ${distance}`
    const aligned = alignTo7(distance, stroke, tokens)
    console.log(`[pushRows] ${event} | tokens=${tokens.length} | aligned=${aligned.length} | gender=${gender}`)

    for (let i = 0; i < AGES.length; i++) {
      const label = AGES[i]
      const raw = aligned[i]
      const t = raw ? normalizeTime(raw) : null // guard when null

      if (label === "10-11") {
        structured.push({ gender, event, distance, stroke, age: "10", time: t })
        structured.push({ gender, event, distance, stroke, age: "11", time: t })
      } else {
        structured.push({ gender, event, distance, stroke, age: label, time: t })
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Gender switches
    if (/^FEMALE\b/i.test(line)) {
      console.log(`[${i}] gender -> female`)
      gender = "female"
      continue
    }
    if (/^(OPEN\/MALE|OPEN\s*\/\s*MALE|MALE\/OPEN|MALE|OPEN)\b/i.test(line)) {
      console.log(`[${i}] gender -> male`)
      gender = "male"
      continue
    }
    if (!gender) {
      // Ignore everything until gender is set
      continue
    }

    // Event line (now allows inline tail)
    const em = EVENT_RX.exec(line)
    if (!em) {
      // not an event, skip
      continue
    }

    const distance = `${em[1]}m`
    const stroke = em[2]
    console.log(`[${i}] EVENT -> ${stroke} ${distance}`)

    const need = expectedCols(distance, stroke)

    // 1) Inline tokens from the same line
    let tokens: string[] = []
    if (em[3]) {
      const inline = em[3].match(TIME_TOKEN_RX) ?? []
      if (inline.length > 0) {
        tokens = tokens.concat(inline)
        console.log(`[${i}] inline tokens:`, inline)
      }
    }

    // 2) If still short, look ahead on following lines
    let j = i + 1
    while (j < lines.length && tokens.length < need) {
      const peek = lines[j]

      // Stop if we hit a new event or a gender header
      if (EVENT_PREFIX_RX.test(peek)) {
        console.log(`[${i}] stop gather: next line is another event at ${j}`)
        break
      }
      if (/^FEMALE\b/i.test(peek) || /^(OPEN\/MALE|OPEN\s*\/\s*MALE|MALE\/OPEN|MALE|OPEN)\b/i.test(peek)) {
        console.log(`[${i}] stop gather: gender header at ${j}`)
        break
      }

      // Skip age header lines (e.g., "Age 10/11 12 13 ...")
      if (/^Age\b/i.test(peek)) {
        j++
        continue
      }

      const more = peek.match(TIME_TOKEN_RX) ?? []
      if (more.length === 0) {
        console.log(`[${i}] stop gather: no times found at ${j}`)
        break
      }

      tokens = tokens.concat(more)
      j++
    }

    if (tokens.length === 0) {
      console.log(`[${i}] no tokens collected -> skip event`)
      continue
    }

    pushRows(distance, stroke, tokens)
  }

  console.log(`[L7] structured size: ${structured.length}`)
  return structured
}


// consideration-and-qualifying-times-v0-2--london-regional-summer-champs-2025_055780
// only QT times
export function parseSwimmingPdfLayout8(text: string) {
  const lines = text.split("\n").map(s => s.trim()).filter(Boolean)
  console.log("[L8] total lines:", lines.length)

  type Gender = "female" | "male"
  type Course = "lc" | "sc"

  const AGE_COLS = ["11y/12y", "13y", "14y", "15y", "16y", "17y", "18y+"] as const

  const courseFrom = (s: string): Course | null =>
    /LONG\s*COURSE/i.test(s) ? "lc" : (/SHORT\s*COURSE/i.test(s) ? "sc" : null)

  const EVENT_RX =
    /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|(?:Ind(?:ividual)?\.?\s*Medley|IM))\s*(.*)$/i

  // HH:MM:SS(.sss) | MM:SS(.sss) | SS.xx | SS.xxx
  const TIME_RX =
    /(?:\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}\.\d{2})|(?:\d{1,2}\.\d{3})/g

  const PURE_TIMES_RX = /^([0-9:.]+\s*)+$/
  const timesFrom = (s: string) => s.match(TIME_RX) ?? []

  // FIX: match "QT CT QT CT ..." with whitespace/tabs between pairs
  const QTCT_RX = /^(?:QT\s*CT)(?:\s+QT\s*CT){1,}$/i

  const NEED_TOKENS = 14 // QT + CT for 7 age columns

  const normalizeAge = (s: string) =>
    s.replace(/\s+/g, "")
      .replace(/y\+$/i, "+")
      .replace(/y$/i, "")

  const pushRows = (
    out: ImportEvent[] = [],
    gender: Gender,
    course: Course,
    strokeRaw: string,
    distanceNum: string,
    tokens: string[],
  ) => {
    const stroke = /Ind(?:ividual)?\.?\s*Medley|IM/i.test(strokeRaw) ? "Individual Medley" : strokeRaw
    const distance = `${distanceNum}m`
    const event = `${stroke} ${distance}`

    // Even indices = QT
    const qt = Array.from({ length: 7 }, (_, i) => tokens[2 * i] ?? null)

    for (let i = 0; i < AGE_COLS.length; i++) {
      const col = AGE_COLS[i]
      const qtT = normalizeTime(qt[i])

      if (col === "11y/12y") {
        out.push({ gender, course, event, distance, stroke, age: "11", time: qtT })
        out.push({ gender, course, event, distance, stroke, age: "12", time: qtT })
      } else {
        const age = normalizeAge(col)
        out.push({ gender, course, event, distance, stroke, age, time: qtT })
      }
    }
  }

  const structured: ImportEvent[] = []

  let currentCourse: Course | null = null
  let currentGender: Gender | null = null
  let qtctCountInCourse = 0

  let pending: { distance: string, stroke: string, tokens: string[] } | null = null

  const flushPending = () => {
    if (!pending || !currentCourse || !currentGender) {
      pending = null
      return
    }
    const toks = pending.tokens.slice(0, NEED_TOKENS)
    if (toks.length === NEED_TOKENS) {
      pushRows(structured, currentGender, currentCourse, pending.stroke, pending.distance, toks)
    }
    pending = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Course header
    const c = courseFrom(line)
    if (c) {
      flushPending()
      currentCourse = c
      currentGender = null
      qtctCountInCourse = 0
      console.log(`[${i}] course -> ${currentCourse}`)
      continue
    }

    // QT/CT header ⇒ sets gender by position within the course
    if (QTCT_RX.test(line)) {
      flushPending()
      if (!currentCourse) {
        continue
      }
      qtctCountInCourse += 1
      currentGender = (qtctCountInCourse === 1 ? "male" : "female")
      continue
    }

    if (!currentCourse || !currentGender) {
      // Waiting for course + first QT/CT header
      continue
    }

    // Event row
    const m = EVENT_RX.exec(line)
    if (m) {
      flushPending()

      const [, distanceNum, stroke, tail] = m
      let tokens: string[] = timesFrom(tail || "")
      console.log(`[${i}] event -> ${stroke} ${distanceNum}m | inline=${tokens.length}`)

      if (tokens.length < NEED_TOKENS) {
        let j = i + 1
        while (j < lines.length && tokens.length < NEED_TOKENS) {
          const nxt = lines[j]
          if (PURE_TIMES_RX.test(nxt)) {
            const more = timesFrom(nxt)
            if (more.length === 0) break
            tokens.push(...more)
            j++
            i = j - 1
          } else if (QTCT_RX.test(nxt) || courseFrom(nxt)) {
            // New gender section or new course
            break
          } else {
            // Any other non-times line ends the gather
            break
          }
        }
      }

      if (tokens.length === NEED_TOKENS) {
        pushRows(structured, currentGender, currentCourse, stroke, distanceNum, tokens)
      } else {
        // Keep behavior symmetrical with pending path
        console.log(`[${i}] collected ${tokens.length}/${NEED_TOKENS} tokens -> skip`)
      }
      continue
    }

    // Skip other headers/noise
    if (/^(11y\/?12y|Age|Notes|QUALIFYING|CONSIDERATION|FEMALE|OPEN\/?MALE|--\s*\d+\s*of\s*\d+\s*--)/i.test(line)) {
      flushPending()
      continue
    }
  }

  flushPending()
  return structured
}


// cornwall-county-championships-2025-qts_057406
export function parseSwimmingPdfLayout9(text: string) {
  type Gender = "female" | "male"

  const AGE_COLS = ["10-11", "12", "13", "14", "15", "16", "17+"] as const

  const EVENT_RX =
    /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Fly|IM|Individual(?:\s+Medley)?)(?:\s+(.*))?$/i

  const TIME_RX =
    /(?:(?:\d{1,2}[:.])?\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)|(?:\d{1,2}[.]\d{2})/g

  const lines = text.split("\n").map(s => s.trim()).filter(Boolean)
  const structured: ImportEvent[] = []

  let gender: Gender | null = null

  // helpers
  const genderFrom = (s: string): Gender | null => {
    if (/^FEMALE\b/i.test(s)) return "female"
    if (/^(?:OPEN\s*\/\s*MALE|OPEN\/MALE|MALE|OPEN\s*MALE)\b/i.test(s)) return "male"
    return null
  }

  const timesFrom = (s: string) => (s.match(TIME_RX) || [])

  const isPureTimes = (s: string) => {
    const t = timesFrom(s)
    return t.length > 0 && t.join(" ") === s.replace(/\s+/g, " ")
  }

  const isMeta = (s: string) =>
    /Cornwall|County|Championship|Qualifying|Times|Age\s|Over|Notes/i.test(s)
    || /^-+$/.test(s)
    || s === "."

  const normStroke = (raw: string) => {
    if (/^fly$/i.test(raw)) return "Butterfly"
    if (/^im$/i.test(raw) || /Individual\s+Medley/i.test(raw)) return "Individual Medley"
    return raw.replace(/\s+/g, " ")
  }

  const expectedCount = (distance: string, stroke: string) => {
    const d = `${distance}` // "50", "100", ..., "1500"
    const isIM = /Individual\s+Medley/i.test(stroke) || /^IM$/i.test(stroke)
    if (d === "800" || d === "1500") return 6 // 12..17+
    if (d === "400" && isIM) return 6
    return 7
  }

  const alignTo7 = (
    distance: string,
    stroke: string,
    tokens: string[]
  ): (string | null)[] => {
    const need = expectedCount(distance, stroke)
    let arr: (string | null)[] = tokens.slice(0, need)
    if (need === 6) arr = [null, ...arr]
    while (arr.length < 7) arr.push(null)
    return arr
  }

  const pushEvent = (gender: Gender, distanceNum: string, strokeRaw: string, tokens: string[]) => {
    const stroke = normStroke(strokeRaw)
    const distance = `${distanceNum}m`
    const event = `${stroke} ${distance}`
    const aligned = alignTo7(distanceNum, stroke, tokens)

    for (let i = 0; i < AGE_COLS.length; i++) {
      const label = AGE_COLS[i]
      const raw = aligned[i]
      const t = normalizeTime(raw)

      if (label === "10-11") {
        structured.push({ gender, event, distance, stroke, age: "10", time: t })
        structured.push({ gender, event, distance, stroke, age: "11", time: t })
      } else {
        structured.push({ gender, event, distance, stroke, age: label, time: t })
      }
    }
  }

  let pending: { distance: string, stroke: string, tokens: string[] } | null = null

  const flushPending = () => {
    if (pending && gender) {
      pushEvent(gender, pending.distance, pending.stroke, pending.tokens)
    }
    pending = null
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw) continue

    const g = genderFrom(raw)
    if (g) {
      flushPending()
      gender = g
      continue
    }

    if (!gender) continue
    if (isMeta(raw)) continue

    const m = EVENT_RX.exec(raw)
    if (m) {
      flushPending()
      const [, distNum, strokeRaw, tail = ""] = m
      const distance = String(parseInt(distNum, 10)) // "50"..."1500"
      const stroke = normStroke(strokeRaw)
      const need = expectedCount(distance, stroke)
      const tokens = timesFrom(tail)

      if (tokens.length >= need) {
        pushEvent(gender, distance, stroke, tokens.slice(0, need))
      } else {
        pending = { distance, stroke, tokens: tokens.slice() }
      }
      continue
    }

    if (pending && isPureTimes(raw)) {
      const distance = pending.distance
      const stroke = normStroke(pending.stroke)
      const need = expectedCount(distance, stroke)
      pending.tokens.push(...timesFrom(raw))
      if (pending.tokens.length >= need) {
        pushEvent(gender, distance, stroke, pending.tokens.slice(0, need))
        pending = null
      }
      continue
    }
  }

  flushPending()
  return structured
}

// Cornwall-County-Champs-2026-QTs
// time are taken from 50m Freestyle not consideration block
export function parseSwimmingPdfLayout10(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  type Gender = "female" | "male"

  // “Age Group 10&11 12 13 14 15 16 17& Over”
  // We always output: 10, 11, 12, 13, 14, 15, 16, 17+
  const AGE_SLOTS = ["10-11", "12", "13", "14", "15", "16", "17+"] as const

  // Gender headers
  const FEMALE_RX = /\b(FEMALE)\b/i
  const MALE_RX = /\b(MALE\/?OPEN|OPEN\/?MALE|MALE|MALE\s*\/\s*OPEN)\b/i

  // Event line. Example: "50m Freestyle", "400m Freestyle  06:40.00", "100m Fly ..."
  const EVENT_RX =
    /^(\d{2,4})m\s+(Freestyle|Backstroke|Breaststroke|(?:Butterfly|Fly)|(?:Ind(?:ividual)?\.?\s*Medley|IM))\*?\s*(.*)$/i

  // “Consideration” block begins here (may have times on same line OR on next lines)
  const CONSID_RX = /^Consideration\b/i

  // A single token can be:
  // - HH:MM:SS(.sss)
  // - MM:SS(.sss)
  // - SS.ss or SS.sss
  // We’ll tokenize by whitespace and test per token.
  const TIME_ATOM_RX =
    /^(?:\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?|\d{1,2}:\d{2}(?:\.\d{1,3})?|\d{1,2}\.\d{2,3})$/

  // Placeholder tokens (e.g., xxxx, —, -). Treat as missing slot (null).
  const isPlaceholderToken = (t: string) =>
    /^x+$/i.test(t.replace(/[.:]/g, "")) || t === "—" || t === "-"

  // A line that consists only of time/placeholder tokens (used to skip Consideration blocks)
  const isTimesOrPlaceholderLine = (s: string) => {
    const parts = s.split(/\s+/).filter(Boolean)
    if (!parts.length) return false
    return parts.every(p => TIME_ATOM_RX.test(p) || isPlaceholderToken(p))
  }

  // Normalize stroke names
  const normStroke = (s: string) => {
    if (/^fly$/i.test(s) || /butterfly/i.test(s)) return "Butterfly"
    if (/^im$/i.test(s) || /ind(?:ividual)?\.?\s*medley/i.test(s)) return "Individual Medley"
    return s
  }

  // Tokenize a string into an ordered list of 0..7 columns including nulls for placeholders.
  function extractColsFromString(s: string, acc: (string | null)[]) {
    if (!s) return
    const parts = s.split(/\s+/).filter(Boolean)
    for (const p of parts) {
      if (isPlaceholderToken(p)) acc.push(null)
      else if (TIME_ATOM_RX.test(p)) acc.push(p)
      // else ignore non-time junk
      if (acc.length >= 7) break
    }
  }

  // Emit rows for one event
  function pushAgeRows(
    out: ImportEvent[],
    gender: Gender,
    distance: string,
    stroke: string,
    cols: (string | null)[]
  ) {
    const event = `${stroke} ${distance}`
    // Ensure exactly 7 slots
    while (cols.length < 7) cols.push(null)

    for (let i = 0; i < AGE_SLOTS.length; i++) {
      const slot = AGE_SLOTS[i]
      const val = normalizeTime(cols[i])

      if (slot === "10-11") {
        out.push({ gender, event, distance, stroke, age: "10", time: val })
        out.push({ gender, event, distance, stroke, age: "11", time: val })
      } else {
        out.push({ gender, event, distance, stroke, age: slot, time: val })
      }
    }
  }

  const structured: ImportEvent[] = []
  let currentGender: Gender | null = null

  // Walk the lines
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw) continue

    // Gender switches
    if (MALE_RX.test(raw)) {
      currentGender = "male"
      continue
    }
    if (FEMALE_RX.test(raw)) {
      currentGender = "female"
      continue
    }

    // Skip “Age Group …” header line; it’s informative only
    if (/^Age\s*Group\b/i.test(raw)) continue

    // Match an event row
    const m = EVENT_RX.exec(raw)
    if (!m) continue

    // Default gender to male if not set yet (so UI shows something)
    if (!currentGender) currentGender = "male"

    const dist = `${m[1]}m`
    const stroke = normStroke(m[2])
    const tail = (m[3] || "").trim()

    // Collect up to 7 columns from tail + subsequent lines, stopping at "Consideration" or next header/event
    const cols: (string | null)[] = []
    extractColsFromString(tail, cols)

    let j = i + 1

    while (j < lines.length && cols.length < 7) {
      const ln = lines[j]

      // Stop accumulating if the “Consideration” section begins.
      if (CONSID_RX.test(ln)) {
        // Skip the entire Consideration block (this line + any following time/placeholder lines)
        j += 1
        while (j < lines.length && isTimesOrPlaceholderLine(lines[j])) j += 1
        break
      }

      // Stop if the next event/gender/age header starts
      if (EVENT_RX.test(ln) || MALE_RX.test(ln) || FEMALE_RX.test(ln) || /^Age\s*Group\b/i.test(ln)) {
        break
      }

      // Otherwise, consume times from this line
      extractColsFromString(ln, cols)
      j += 1
    }

    // Emit rows for this event
    pushAgeRows(structured, currentGender, dist, stroke, cols)

    // Advance i to where we stopped scanning
    i = j - 1
  }

  return structured
}

// County Qualifying Times 2026
// Qualifying Times WCSA Championships 2026
export function parseSwimmingPdfLayout11(text: string) {
  const raw = text.split("\n")
  const lines = raw.map(s => s.replace(/\s{2,}/g, " ").trim()).filter(Boolean)

  const AGES = ["10-11", "12", "13", "14", "15", "16", "17+"] as const
  const used: boolean[] = new Array(lines.length).fill(false)

  // Event at line start (fallback)
  const EVENT_RX = /^(\d{2,4})m\s+(Freestyle|Free|Backstroke|Back|Breaststroke|Breast|Butterfly|Fly|(?:Ind(?:ividual)?\.?\s*Medley|IM))\b(?:\s+(.*))?$/i
  // Event anywhere in the line: capture left times (grp1) and right times (grp4)
  const EVENT_INLINE_RX = /^(.*?)(\d{2,4})m\s+(Freestyle|Free|Backstroke|Back|Breaststroke|Breast|Butterfly|Fly|(?:Ind(?:ividual)?\.?\s*Medley|IM))\b(?:\s+(.*))?$/i

  // Times like 00:40.50, 1:07.50, 03:25.000, 1.07.50, 59.66 etc.
  const TIMES_RX =
    /(?:\d{1,2}\.\d{2}\.\d{2,3})|(?:\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}\.\d{2}(?=(?:\d{1,2}(?:[.:])|\d{2,4}\s*m\b|$)))|(?:\d{1,2}\.\d{3})(?!\d)/g

  const isPureTimes = (s: string) => {
    const t = s.match(TIMES_RX) || []
    return t.length > 0 && t.join(" ") === s.replace(/\s+/g, " ")
  }
  const timesFrom = (s: string) => (s.match(TIMES_RX) || [])

  const normalizeStroke = (s: string) => {
    const x = s.toLowerCase()
    if (x.startsWith("ind") || x === "im") return "Individual Medley"
    if (x.startsWith("free")) return "Freestyle"
    if (x.startsWith("back")) return "Backstroke"
    if (x.startsWith("breast")) return "Breaststroke"
    if (x.startsWith("fly")) return "Butterfly"
    return s
  }

  const needCount = (distance: string, stroke: string) => {
    const isIM = /Individual\s*Medley/i.test(stroke)
    if (distance === "800m" || distance === "1500m") return 6 // 12..17+
    if (distance === "400m" && isIM) return 6 // 12..17+
    return 7 // 10/11..17+
  }

  const alignTo7 = (distance: string, stroke: string, toks: string[]) => {
    const need = needCount(distance, stroke)
    let arr = toks.slice(0, need)
    if (need === 6) arr = [null as any, ...arr] // pad missing 10/11
    while (arr.length < 7) arr.push(null as any)
    return arr as (string | null)[]
  }

  const pushAgeRows = (out: ImportEvent[], gender: "female" | "male", distanceNum: string, strokeRaw: string, tokens: string[]) => {
    const distance = `${distanceNum}m`
    const stroke = normalizeStroke(strokeRaw)
    const event = `${stroke} ${distance}`
    const aligned = alignTo7(distance, stroke, tokens)

    console.log(`[pushAgeRows] event=${event} gender=${gender} tokens_in=${tokens.length}`)

    for (let i = 0; i < AGES.length; i++) {
      const label = AGES[i]
      const tt = normalizeTime(aligned[i])
      if (label === "10-11") {
        out.push({ gender, event, distance, stroke, age: "10", time: tt })
        out.push({ gender, event, distance, stroke, age: "11", time: tt })
      } else {
        out.push({ gender, event, distance, stroke, age: label, time: tt })
      }
    }
  }

  const collectPrevTimes = (idxEvt: number, need: number) => {
    const tokens: string[] = []
    let i = idxEvt - 1
    while (i >= 0 && !used[i] && isPureTimes(lines[i]) && tokens.length < need) {
      tokens.unshift(...timesFrom(lines[i]))
      used[i] = true
      i--
    }
    return tokens.slice(0, need)
  }

  const collectNextTimes = (idxEvt: number, need: number, tailFirst: string[]) => {
    const tokens: string[] = [...tailFirst]
    let i = idxEvt + 1
    while (i < lines.length && !used[i] && isPureTimes(lines[i]) && tokens.length < need) {
      tokens.push(...timesFrom(lines[i]))
      used[i] = true
      i++
    }
    return tokens.slice(0, need)
  }

  // --- NEW: figure out which side is which gender based on header line ---
  let leftGender: "female" | "male" = "male"
  let rightGender: "female" | "male" = "female"
  for (const s of lines) {
    const L = s.toUpperCase()
    if (/\b(FEMALE|WOMEN|GIRLS)\b.*\b(OPEN\/?MALE|MALE|MEN|BOYS)\b/.test(L)) {
      leftGender = "female"; rightGender = "male"
      console.log(`[header] left=female right=male (from: "${s}")`)
      break
    }
    if (/\b(OPEN\/?MALE|MALE|MEN|BOYS)\b.*\b(FEMALE|WOMEN|GIRLS)\b/.test(L)) {
      leftGender = "male"; rightGender = "female"
      console.log(`[header] left=male right=female (from: "${s}")`)
      break
    }
  }

  const out: ImportEvent[] = []

  for (let i = 0; i < lines.length; i++) {
    if (used[i]) continue
    const line = lines[i]

    // --- NEW: inline pattern (times left EVENT times right) ---
    const mi = EVENT_INLINE_RX.exec(line)
    if (mi) {
      used[i] = true
      const left = (mi[1] || "").trim()
      const distNum = mi[2]
      const strokeRaw = mi[3]
      const right = (mi[4] || "").trim()

      const distance = `${distNum}m`
      const stroke = normalizeStroke(strokeRaw)
      const need = needCount(distance, stroke)

      // take last N from the left side (in case extra) and first N from the right side
      const leftTokens = timesFrom(left).slice(-need)
      const rightTokens = timesFrom(right).slice(0, need)

      console.log(`[inline] ${stroke} ${distance} | leftTokens=${leftTokens.length} rightTokens=${rightTokens.length} need=${need}`)

      if (leftTokens.length === need) {
        pushAgeRows(out, leftGender, distNum, strokeRaw, leftTokens)
      } else {
        console.log(`[inline] left side insufficient (${leftTokens.length}/${need})`)
      }

      if (rightTokens.length === need) {
        pushAgeRows(out, rightGender, distNum, strokeRaw, rightTokens)
      } else {
        console.log(`[inline] right side insufficient (${rightTokens.length}/${need})`)
      }

      // If neither side had tokens (e.g., a bare "100m IM"), fall through to fallback
      if (leftTokens.length === 0 && rightTokens.length === 0) {
        used[i] = false // allow fallback to try
      } else {
        continue
      }
    }

    // --- Fallback: event at start + collect from surrounding lines ---
    const m = EVENT_RX.exec(line)
    if (!m) continue

    used[i] = true

    const distNum = m[1]
    const strokeRaw = m[2]
    const tail = (m[3] || "").trim()

    const distance = `${distNum}m`
    const stroke = normalizeStroke(strokeRaw)
    const need = needCount(distance, stroke)

    const maleTokens = collectPrevTimes(i, need)
    const tailTokens = timesFrom(tail)
    const femaleTokens = collectNextTimes(i, need, tailTokens)

    console.log(`[fallback] ${stroke} ${distance} | malePrev=${maleTokens.length} femaleNext=${femaleTokens.length} need=${need}`)

    if (maleTokens.length > 0) {
      pushAgeRows(out, "male", distNum, strokeRaw, maleTokens)
    }
    if (femaleTokens.length > 0) {
      pushAgeRows(out, "female", distNum, strokeRaw, femaleTokens)
    }
  }

  console.log(`[L11] structured size: ${out.length}`)
  return out
}


// County-Championship-QTs-2025-1
export function parseSwimmingPdfLayout12(text: string) {
  const lines = text.split("\n").map(l => l.replace(/\s{2,}/g, " ").trim()).filter(Boolean);

  // Ages: top bucket stored as "16" (no plus)
  const AGES = ["10", "11", "12", "13", "14", "15", "16"] as const;

  // How many events belong to the first course (LC). Remaining events are SC.
  const LC_EVENT_COUNT = 17;

  // Times: supports 1.31.10 / 01:31.10 / 59.66 / 1:02.345 / 1.02.345
  const TIMES_RX =
    /(?:\d{1,2}\.\d{2}\.\d{2})|(?:\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}\.\d{2}(?=(?:\s|$)))|(?:\d{1,2}\.\d{3})(?!\d)/g;

  const timesFrom = (s: string) => s.match(TIMES_RX) ?? [];

  const isTimesOnly = (s: string) =>
    /^[\d:.\s]+$/.test(s) && (timesFrom(s).join(" ") === s.replace(/\s+/g, " "));

  const strokeCanonical = (s: string) => {
    const x = s.toLowerCase();
    if (x.startsWith("ind") || x === "im" || /i\.?\s*m\.?/i.test(s)) return "Individual Medley";
    if (x.startsWith("free")) return "Freestyle";
    if (x.startsWith("back")) return "Backstroke";
    if (x.startsWith("breast")) return "Breaststroke";
    if (x.startsWith("fly") || x.startsWith("butter")) return "Butterfly";
    return s;
  };

  // columns per side (per gender) needed for this event
  const needByEvent = (distance: string, stroke: string) => {
    const d = distance.replace(/m$/i, "");
    const isIM = /medley/i.test(stroke);
    if (d === "800" || d === "1500") return 5;     // 12..16
    if (d === "400" && isIM) return 5;             // 12..16
    return 7;                                      // 10..16
  };

  // Align tokens to ages 10..16. Shift when there are only 5 (or 6) columns.
  const alignTo7 = (distance: string, stroke: string, tokens: string[]) => {
    const need = needByEvent(distance, stroke);
    const picked = tokens.slice(0, need);
    const out: (string | null)[] = Array(7).fill(null);
    if (need === 7) {              // 10..16
      for (let i = 0; i < 7; i++) out[i] = picked[i] ?? null;
    } else if (need === 6) {       // 11..16
      for (let i = 0; i < 6; i++) out[i + 1] = picked[i] ?? null;
    } else {                       // 12..16  (need === 5)
      for (let i = 0; i < 5; i++) out[i + 2] = picked[i] ?? null;
    }
    return out;
  };

  // Event anywhere on the line; accept optional "m" (handles "800 Free" too).
  // Groups: 1=left segment, 2=distance, 3=stroke, 4=right segment
  const EVENT_INLINE_RX =
    /^(.*?)(?<!\d)(\d{2,4})\s*m?\b\s+(Freestyle|Free|Backstroke|Back|Breaststroke|Breast|Butterfly|Fly|I\.?\s*M\.?|IM|Ind(?:ividual)?\.?\s*Medley)\b(.*)$/i;

  const out: ImportEvent[] = [];
  let eventIndex = 0; // 0.. -> first LC_EVENT_COUNT events = lc, others = sc

  const pushSide = (
    course: "lc" | "sc",
    gender: "male" | "female",
    distanceNum: string,
    strokeRaw: string,
    tokens: string[]
  ) => {
    const distance = `${distanceNum}m`;
    const stroke = strokeCanonical(strokeRaw);
    const event = `${stroke} ${distance}`;
    const aligned = alignTo7(distance, stroke, tokens);
    console.log(`[push] ${event} | course=${course} | gender=${gender} | tokens=${tokens.length} | need=${needByEvent(distance, stroke)}`);

    for (let i = 0; i < AGES.length; i++) {
      const age = AGES[i];                  // top bucket stored as "16"
      const t = normalizeTime(aligned[i]);
      out.push({ gender, course, event, distance, stroke, age, time: t });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw ||
      /^(Produced by|Events|No event|All entries|License numbers|Galaentries@|Please be aware|Female Qualifying Times|Open\/Male Qualifying Times|Short course equivalent times)$/i.test(raw) ||
      /(Born|yrs|earlier)/i.test(raw) ||
      /^\d{4}(?:\s+\d{4})?$/.test(raw)) {
      continue;
    }

    // Normalize "I.M." to "IM" to simplify stroke detection
    const line = raw.replace(/\bI\.\s*M\.?/gi, "IM");

    const m = EVENT_INLINE_RX.exec(line);
    if (!m) continue;

    const leftSeg = (m[1] || "").trim();
    const distNum = m[2];
    const strokeRx = m[3];
    let rightSeg = (m[4] || "").trim();

    const distance = `${distNum}m`;
    const stroke = strokeCanonical(strokeRx);
    const need = needByEvent(distance, stroke);
    const course: "lc" | "sc" = (eventIndex < LC_EVENT_COUNT) ? "lc" : "sc";

    // Left tokens (male): take LAST 'need' tokens before the event.
    const leftTokens = timesFrom(leftSeg).slice(-need);

    // Right tokens (female): FIRST 'need' tokens after the event, possibly spanning pure-times continuation lines.
    let rightTokens = timesFrom(rightSeg);
    let j = i + 1;
    while (rightTokens.length < need && j < lines.length && isTimesOnly(lines[j])) {
      rightTokens = rightTokens.concat(timesFrom(lines[j]));
      j++;
    }
    rightTokens = rightTokens.slice(0, need);

    console.log(`[event] ${stroke} ${distance} | eventIndex=${eventIndex} -> course=${course} | left=${leftTokens.length}/${need} right=${rightTokens.length}/${need}`);

    if (leftTokens.length === need) pushSide(course, "male", distNum, strokeRx, leftTokens);
    if (rightTokens.length === need) pushSide(course, "female", distNum, strokeRx, rightTokens);

    // advance to after any continuation lines we consumed
    i = j - 1;
    eventIndex += 1;
  }

  console.log(`[L12] structured size: ${out.length} | events parsed: ${eventIndex}`);
  return out;
}


// 2026 - Wiltshire County
export function parseSwimmingPdfLayout13(text: string) {
  type Gender = "male" | "female"

  const lines = text
    .split("\n")
    .map((l) => l.replace(/\s{2,}/g, " ").trim())
    .filter(Boolean)

  const STROKE_TOKEN_RX = /(Free|Back|Breast|B\/Fly|IM)/g
  const DIST_TOKEN_RX = /(\d{2,4}m)/g

  const TIMES_RX =
    /(?:\d{1,2}\.\d{2}\.\d{2})|(?:\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}:\d{2}(?:\.\d{1,3})?)|(?:\d{1,2}\.\d{2}(?=(?:\d{1,2}(?:[.:])|\d{2,4}\s*m\b|\D|$)))/g

  const timesFrom = (s: string): string[] => s.match(TIMES_RX) ?? []

  const normInline = (s: string) =>
    s.replace(/\bI\.\s*M\.?\b/gi, "IM").replace(/\bB\s*\/\s*Fly\b/gi, "B/Fly")

  const deglueBoundary = (s: string) =>
    s.replace(/(\d{1,2}\.\d{2})(?=\d{2,4}\s*m\b)/g, "$1 ")

  const parseHeaderPair = (i: number) => {
    const strokeLine = normInline(lines[i]).replace(/\s+/g, "")
    const distLine = normInline(lines[i + 1]).replace(/\s+/g, "")
    const strokes = strokeLine.match(STROKE_TOKEN_RX) ?? []
    const dists = distLine.match(DIST_TOKEN_RX) ?? []
    return { strokes, dists, ok: strokes.length === dists.length && strokes.length >= 12 }
  }

  const isAgeLine = (s: string) =>
    /^\s*(?:10\/?11\s*yr?s?|10\/?11|1[2-6]\s*yr?s?|17\+\s*yr?)/i.test(s)

  const labelToAges = (label: string): string[] => {
    const l = label.toLowerCase()
    if (/10\/?11/.test(l)) return ["10", "11"]
    if (/17\+/.test(l)) return ["17+"]
    const m = l.match(/(1[2-6])\s*(?:yr?s?)?/)
    return m ? [m[1]] : []
  }

  const canonicalStroke = (s: string) => {
    const v = s.trim().toLowerCase()
    if (v === "free") return "Freestyle"
    if (v === "back") return "Backstroke"
    if (v === "breast") return "Breaststroke"
    if (v === "im") return "Individual Medley"
    if (v === "b/fly") return "Butterfly"
    return s.trim()
  }

  const out: ImportEvent[] = []
  let blockIndex = 0 // 0 = female, 1 = male

  for (let i = 0; i < lines.length - 1; i++) {
    const { strokes, dists, ok } = parseHeaderPair(i)
    if (!ok) continue

    const cols = strokes.map((st, idx) => {
      const strokeFull = canonicalStroke(st)
      const distance = dists[idx]
      return {
        stroke: strokeFull,
        distance,
        event: `${strokeFull} ${distance}`,
      }
    })
    const numCols = cols.length

    const gender: Gender = blockIndex === 0 ? "female" : "male"
    blockIndex += 1

    let r = i + 2
    let agesParsed = 0

    while (r < lines.length && agesParsed < 7) {
      let raw = normInline(lines[r])
      if (!isAgeLine(raw)) break

      raw = deglueBoundary(raw)

      const mAge = raw.match(/^\s*(?:10\/?11\s*yr?s?|10\/?11|1[2-6]\s*yr?s?|17\+\s*yr?)/i)
      const ageLabel = mAge ? mAge[0] : ""
      const ages = labelToAges(ageLabel)

      const tokens: (string | null)[] = timesFrom(raw).slice(0, numCols)

      if (tokens.length < numCols && r + 1 < lines.length) {
        const nxt = normInline(lines[r + 1])
        const nxtTimes = timesFrom(nxt)
        if (nxtTimes.length && nxtTimes.join("") === nxt.replace(/\s+/g, "")) {
          tokens.push(...nxtTimes)
          r += 1
        }
      }

      while (tokens.length < numCols) tokens.push(null)

      for (let c = 0; c < numCols; c++) {
        const { stroke, distance, event } = cols[c]
        const t = tokens[c] ?? null
        for (const a of ages) {
          out.push({
            gender,
            event,
            distance,
            stroke,
            age: a,
            time: normalizeTime(t),
          })
        }
      }

      agesParsed += 1
      r += 1
    }

    i = r - 1
  }

  return out
}

function fixRawTime(value: string | number): string {
  if (typeof value === "string") {
    // case 1: multiple dots like "2.48.10" → "00:02:48"
    if ((value.match(/\./g) || []).length >= 2) {
      const parts = value.split(".")
      const minutes = parts[0].padStart(2, "0")
      const seconds = parts[1].padStart(2, "0")
      return `00:${minutes}:${seconds}`
    }

    // case 2: concatenated MMSS.s like "0140.8" → "00:01:40"
    const match = value.match(/^0?(\d+)(\d{2})(?:\.(\d+))?$/)
    if (match) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      return `00:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    }

    // fallback: keep original string
    return value
  }

  // numbers: treat as Excel fraction or minutes
  if (typeof value === "number") {
    if (value > 0 && value < 1) {
      const totalSeconds = Math.round(value * 24 * 60 * 60)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`
    }
    if (value >= 1) {
      const minutes = Math.floor(value / 60)
      const seconds = Math.round(value % 60)
      return `00:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
  }

  return ""
}

function normalizeTime(t: string | null): string | null {
  if (!t) return null
  t = t.replace(",", ".").trim()

  // e.g., "1.33:0" → "00:01:33", "12.07:3" → "00:12:07"
  if (/^\d{1,2}\.\d{1,2}:\d+$/.test(t)) {
    const [minPart, secAndTail] = t.split(".")
    const secPart = secAndTail.split(":")[0]
    const minutes = String(parseInt(minPart, 10)).padStart(2, "0")
    const seconds = String(parseInt(secPart, 10)).padStart(2, "0")
    return `00:${minutes}:${seconds}`
  }

  // Case mm:ss (no decimals) → convert to mm.ss
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [m, s] = t.split(":")
    return `${parseInt(m, 10)}.${s}`
  }

  // Case m.ss.xx → convert to hh:mm:ss (drop hundredths)
  if (/^\d+\.\d+\.\d+$/.test(t)) {
    const parts = t.split(".")
    const minutes = String(parseInt(parts[0], 10)).padStart(2, "0")
    const seconds = String(parseInt(parts[1], 10)).padStart(2, "0")
    return `00:${minutes}:${seconds}`
  }

  // Case mm:ss.xx → convert to hh:mm:ss
  if (/^\d{1,2}:\d{2}\.\d+$/.test(t)) {
    const [m, sRaw] = t.split(":")
    const seconds = Math.floor(parseFloat(sRaw)).toString().padStart(2, "0")
    const minutes = String(parseInt(m, 10)).padStart(2, "0")
    return `00:${minutes}:${seconds}`
  }

  // Case hh:mm:ss → zero-pad just in case
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) {
    const [h, m, s] = t.split(":")
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`
  }

  return t
}

function normalizeAge(age: string | null | undefined): string {
  if (!age) return ""

  switch (age) {
    case "10yrs": return "10"
    case "11yrs": return "11"
    case "12yrs": return "12"
    case "13yrs": return "13"
    case "14yrs": return "14"
    case "15yrs": return "15"
    case "16yrs": return "16"
    case "17/ov": return "17+"
    default: return age
  }
}
