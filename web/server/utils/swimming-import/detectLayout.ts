import type { ImportLayoutDetection, ImportLayoutFileType } from "../../../shared/importLayoutCatalog"
import { importLayoutById, importLayoutCatalog } from "../../../shared/importLayoutCatalog"

interface DetectionRule {
  pattern: RegExp
  weight: number
}

const detectionRules: Record<string, DetectionRule[]> = {
  layout1: [ { pattern: /cambridgeshire county championships?/, weight: 0.9 } ],
  layout2: [ { pattern: /swim england norfolk/, weight: 0.45 }, { pattern: /mens?\s*\/\s*open/, weight: 0.25 } ],
  layout3: [ { pattern: /dorset county asa/, weight: 0.9 } ],
  layout4: [ { pattern: /hampshire county champ/, weight: 0.9 } ],
  layout5: [ { pattern: /oxfordshire\s*&\s*north buckinghamshire/, weight: 0.9 }, { pattern: /accepted.*consider/, weight: 0.1 } ],
  layout6: [ { pattern: /somerset asa county qualifying times/, weight: 0.9 } ],
  layout7: [ { pattern: /berkshire\s*&\s*south buckinghamshire/, weight: 0.95 }, { pattern: /berkshire\s*&\s*south bucks/, weight: 0.95 } ],
  layout8: [ { pattern: /(?:se|south east) london summer championships/, weight: 0.9 } ],
  layout9: [ { pattern: /cornwall county championships qualifying times for 2025/, weight: 1 } ],
  layout10: [ { pattern: /cornwall county champs 2026/, weight: 0.8 }, { pattern: /qualifying and consideration times/, weight: 0.2 } ],
  layout11: [ { pattern: /wcsa championships?/, weight: 0.8 }, { pattern: /worcestershire swimming/, weight: 0.8 } ],
  layout12: [ { pattern: /sussex county asa championships?/, weight: 0.9 } ],
  layout13: [ { pattern: /wiltshire county/, weight: 0.9 } ],
  layout14: [ { pattern: /swim england norfolk county championships? 2027/, weight: 0.8 }, { pattern: /long course qt/, weight: 0.2 } ],
  layout15: [ { pattern: /swim england suffolk county/, weight: 0.75 }, { pattern: /championship qualifying times 2027/, weight: 0.2 }, { pattern: /open\s*\/\s*male/, weight: 0.05 } ],
  layout16: [ { pattern: /leicestershire age groups and championships entry times/, weight: 0.85 }, { pattern: /male open entry time 25m female/, weight: 0.15 } ],
  layout17: [ { pattern: /surrey county age group championships 2027/, weight: 0.75 }, { pattern: /qualifying and consideration times/, weight: 0.2 }, { pattern: /county qualifying times, long course pool/, weight: 0.05 } ],
  layout18: [ { pattern: /warwickshire county championships 2027/, weight: 0.8 }, { pattern: /short course times or converted long course/, weight: 0.15 }, { pattern: /hundredths of a second digit/, weight: 0.05 } ],
  layout19: [ { pattern: /wiltshire (?:county qualification times|swimming championship)/, weight: 0.8 }, { pattern: /age on 31\/12\/27/, weight: 0.1 }, { pattern: /all times are 25m/, weight: 0.1 } ],
  layout20: [ { pattern: /swim england hertfordshire/, weight: 0.65 }, { pattern: /county championships 2027/, weight: 0.2 }, { pattern: /qualifying and consideration times/, weight: 0.15 } ],
  layout21: [ { pattern: /northamptonshire asa\s*-\s*county championships/, weight: 0.8 }, { pattern: /2027 qualifying times/, weight: 0.15 }, { pattern: /all times displayed above are in 25m format/, weight: 0.05 } ],
  layout22: [ { pattern: /lancashire county water polo\s*&\s*swimming association/, weight: 0.75 }, { pattern: /age groups and championships 2027/, weight: 0.15 }, { pattern: /consideration times short course/, weight: 0.1 } ],
  layout23: [ { pattern: /cumbria county championships 2027/, weight: 0.75 }, { pattern: /short course qualifying times/, weight: 0.15 }, { pattern: /lower limit time/, weight: 0.1 } ],
  layout25: [ { pattern: /south west qt\.pdf/, weight: 0.75 }, { pattern: /all entries must be made from times on the rankings database/, weight: 0.2 }, { pattern: /3rd november 2025/, weight: 0.05 } ],
  layout26: [ { pattern: /cambridgeshire county championships qualifying times 2026/, weight: 0.65 }, { pattern: /all entries must include a time which is equal to or faster than qt or ct/, weight: 0.25 }, { pattern: /2026 secc qtct\.xlsx/, weight: 0.1 } ],
  layout27: [ { pattern: /seh county championships 2027 qualifying and consideration times/, weight: 0.7 }, { pattern: /qualifying window\s*:\s*16th may\s*-\s*6th december 2026/, weight: 0.2 }, { pattern: /open\/male/, weight: 0.1 } ],
  layout28: [ { pattern: /staffordshire qt_2027_15sep26\.pdf/, weight: 0.8 }, { pattern: /county qualifying times 2027/, weight: 0.15 }, { pattern: /male\/open female/, weight: 0.05 } ],
  layout32: [ { pattern: /swim england east region long course championships 2026/, weight: 0.7 }, { pattern: /short course times women men\/open/, weight: 0.15 }, { pattern: /qualifying period is 1 january 2025 to the entry closing date/, weight: 0.1 }, { pattern: /east region\.pdf/, weight: 0.05 } ],
}

const monthNumbers: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
}

const normalize = ( value: string ) => value.toLowerCase().replace( /\s+/g, " " ).trim()

function formatDetectedDate( day: string, month: string, year: string ) {
  const monthNumber = monthNumbers[month.toLowerCase()]
  return monthNumber ? `${year}-${monthNumber}-${day.padStart( 2, "0" )}` : null
}

function extractDateAfter( source: string, labels: RegExp[] ) {
  const textualDate = /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})/i
  const numericDate = /(\d{1,2})[/-](\d{1,2})[/-](20\d{2})/

  for ( const label of labels ) {
    const labelMatch = label.exec( source )
    if ( !labelMatch || labelMatch.index === undefined ) continue
    const nearby = source.slice( labelMatch.index, labelMatch.index + 140 )
    const textMatch = textualDate.exec( nearby )
    if ( textMatch ) return formatDetectedDate( textMatch[1], textMatch[2], textMatch[3] )
    const numberMatch = numericDate.exec( nearby )
    if ( numberMatch ) return `${numberMatch[3]}-${numberMatch[2].padStart( 2, "0" )}-${numberMatch[1].padStart( 2, "0" )}`
  }

  return null
}

function extractAchievementRange( source: string ) {
  const textualDate = "(\\d{1,2})(?:st|nd|rd|th)?\\s+(january|february|march|april|may|june|july|august|september|october|november|december)\\s+(20\\d{2})"
  const match = new RegExp( `times? to be achieved from\\s+${textualDate}(?:\\s*[-–—]\\s*|\\s+(?:until|to)\\s+)${textualDate}`, "i" ).exec( source )
  if ( !match ) return null

  return {
    start: formatDetectedDate( match[1], match[2], match[3] ),
    end: formatDetectedDate( match[4], match[5], match[6] ),
  }
}

function extractSwumBetweenRange( source: string ) {
  const match = /times must have been swum between\s+(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s+and\s+(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i.exec( source )
  if ( !match ) return null

  const fullYear = ( year: string ) => year.length === 2 ? `20${year}` : year
  return {
    start: `${fullYear( match[3] )}-${match[2].padStart( 2, "0" )}-${match[1].padStart( 2, "0" )}`,
    end: `${fullYear( match[6] )}-${match[5].padStart( 2, "0" )}-${match[4].padStart( 2, "0" )}`,
  }
}

function extractAchievedBetweenRange( source: string ) {
  const textualDate = "(\\d{1,2})(?:st|nd|rd|th)?\\s+(january|february|march|april|may|june|july|august|september|october|november|december)\\s+(20\\d{2})"
  const match = new RegExp( `times? must have been achieved between\\s+${textualDate}\\s+and\\s*${textualDate}`, "i" ).exec( source )
  if ( !match ) return null

  return {
    start: formatDetectedDate( match[1], match[2], match[3] ),
    end: formatDetectedDate( match[4], match[5], match[6] ),
  }
}

function extractQualifyingWindow( source: string ) {
  const match = /qualifying window\s*:\s*(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*[-â€“â€”]\s*(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})/i.exec( source )
  if ( !match ) return null
  return {
    start: formatDetectedDate( match[1], match[2], match[5] ),
    end: formatDetectedDate( match[3], match[4], match[5] ),
  }
}

export function detectImportLayout( text: string, fileName: string, fileType: ImportLayoutFileType ): ImportLayoutDetection {
  const source = normalize( `${fileName} ${text}` )
  const achievementRange = extractAchievementRange( source ) ?? extractSwumBetweenRange( source ) ?? extractAchievedBetweenRange( source ) ?? extractQualifyingWindow( source )
  const detectedYearMatch = source.match( /\b(20(?:2\d|3\d))\b/ )
  const sourceDetectedYear = detectedYearMatch ? Number( detectedYearMatch[1] ) : null

  const ruleScores = new Map( importLayoutCatalog.map( layout => [
    layout.id,
    ( detectionRules[layout.id] ?? [] ).reduce(
      ( total, rule ) => rule.pattern.test( source ) ? total + rule.weight : total,
      0
    ),
  ] ) )
  const hasSpecificXlsxMatch = fileType === "xlsx" && importLayoutCatalog.some(
    layout => layout.fileType === "xlsx" && layout.id !== "xlsx" && ( ruleScores.get( layout.id ) ?? 0 ) >= 0.35
  )

  const candidates = importLayoutCatalog
    .filter( layout => layout.fileType === fileType )
    .map( layout => {
      const score = fileType === "xlsx"
        ? layout.id === "xlsx" ? ( hasSpecificXlsxMatch ? 0.1 : 1 ) : ( ruleScores.get( layout.id ) ?? 0 )
        : ( ruleScores.get( layout.id ) ?? 0 )
      return { id: layout.id, score: Math.min( score, 1 ) }
    } )
    .sort( ( a, b ) => b.score - a.score )

  const best = candidates[0]
  const suggestedLayoutId = best && best.score >= 0.35 ? best.id : null
  const suggestedLayout = suggestedLayoutId ? importLayoutById.get( suggestedLayoutId ) : null
  const detectedYear = suggestedLayout?.defaultYear ?? sourceDetectedYear
  const compatibleLayoutIds = candidates.filter( candidate => candidate.score >= 0.35 ).map( candidate => candidate.id )
  const confidence: ImportLayoutDetection["confidence"] = !best || best.score < 0.35
    ? null
    : best.score >= 0.8 ? "high" : best.score >= 0.55 ? "medium" : "low"

  return {
    suggestedLayoutId,
    suggestedLayoutName: suggestedLayout?.name ?? null,
    confidence,
    score: best?.score ?? 0,
    compatibleLayoutIds,
    detectedYear,
    dates: {
      qualifyingStart: achievementRange?.start ?? extractDateAfter( source, [ /times?.{0,35}(?:swum|achieved).{0,40}(?:since|from)/i, /qualifying start(?: date)?/i ] ) ?? suggestedLayout?.defaultDates?.qualifyingStart ?? null,
      qualifyingEnd: achievementRange?.end ?? extractDateAfter( source, [ /closing date(?: for all events)?(?: is)?/i, /qualifying end(?: date)?/i, /qualifying period.{0,20}(?:ends?|until|to)/i, /times?.{0,35}(?:achieved|swum).{0,20}(?:by|until)/i ] ) ?? suggestedLayout?.defaultDates?.qualifyingEnd ?? null,
      lastRaceDate: extractDateAfter( source, [ /last race date/i, /final competition date/i ] ) ?? suggestedLayout?.defaultDates?.lastRaceDate ?? null,
    },
  }
}
