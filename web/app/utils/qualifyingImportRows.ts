import { timeToSeconds } from "lib"
import type { QualifyingType } from "lib"

export type QualifyingCourse = "lc" | "sc" | "both"

export interface QualifyingImportSelections {
  year: number | string
  scope: string
  area: string
  course: QualifyingCourse
  type: QualifyingType
}

export interface StructuredQualifyingRow {
  gender: string
  course?: string | null
  event: string
  distance: string
  stroke: string
  age: string
  time?: string | null
}

export interface QualifyingImportRow {
  created: Date
  year: number | string
  course: QualifyingCourse | null
  scope: string
  area: string
  gender: string
  age: string
  distance: string
  stroke: string
  timeString: string
  time: number
  type: QualifyingType
}

function normalizeStroke( stroke: string ) {
  switch ( stroke.toLowerCase() ) {
    case "backstroke": return "backstroke"
    case "breaststroke": return "breaststroke"
    case "butterfly": return "butterfly"
    case "freestyle": return "freestyle"
    case "im":
    case "medley":
    case "individual medley":
      return "individual_medley"
    default:
      return stroke.toLowerCase()
  }
}

function resolveCourseForRow( item: StructuredQualifyingRow, sel: QualifyingImportSelections | null ): QualifyingCourse | null {
  const choose = ( value: string | null | undefined ): QualifyingCourse | null =>
    value === "lc" || value === "sc" ? value : null

  const fromRow = choose( item.course )
  if ( fromRow ) return fromRow

  if ( !sel ) return null

  if ( sel.course === "both" ) {
    return item.course === "sc" ? "sc" : "lc"
  }

  return choose( sel.course )
}

export function mapQualifyingImportRows(
  structured: StructuredQualifyingRow[],
  sel: QualifyingImportSelections | null,
  created = new Date()
): QualifyingImportRow[] {
  const year = sel?.year ?? ""
  const scope = sel?.scope ?? ""
  const area = sel?.area ?? ""
  const qtype: QualifyingType = sel?.type ?? "general"

  return structured.flatMap( item => {
    const timeString = item.time?.trim() ?? ""
    if ( !timeString ) return []

    return [ {
      created,
      year,
      course: resolveCourseForRow( item, sel ),
      scope,
      area,
      gender: item.gender,
      age: item.age,
      distance: item.distance,
      stroke: normalizeStroke( item.stroke ),
      timeString,
      time: timeToSeconds( timeString ),
      type: qtype
    } ]
  } )
}
