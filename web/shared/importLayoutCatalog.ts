export type ImportLayoutFileType = "pdf" | "xlsx"

export interface ImportLayoutMetadata {
  id: string
  name: string
  shortName: string
  description: string
  fileType: ImportLayoutFileType
  exampleYear: number
  supportedYears: number[]
  areaCode: string | null
  areaLabel: string
  defaultCourse?: "lc" | "sc" | "both"
}

export type ImportDetectionConfidence = "high" | "medium" | "low"

export interface ImportLayoutDetection {
  suggestedLayoutId: string | null
  suggestedLayoutName: string | null
  confidence: ImportDetectionConfidence | null
  score: number
  compatibleLayoutIds: string[]
  detectedYear: number | null
  dates: {
    qualifyingStart: string | null
    qualifyingEnd: string | null
    lastRaceDate: string | null
  }
}

export const importLayoutCatalog: ImportLayoutMetadata[] = [
  { id: "layout1", name: "Cambridgeshire County", shortName: "Cambridgeshire", description: "Female times, event, then male times", fileType: "pdf", exampleYear: 2026, supportedYears: [ 2026 ], areaCode: "CMBT", areaLabel: "Cambridgeshire" },
  { id: "layout2", name: "Norfolk County (legacy)", shortName: "Norfolk legacy", description: "Open/male and female sections", fileType: "pdf", exampleYear: 2025, supportedYears: [ 2025 ], areaCode: "NRFT", areaLabel: "Norfolk" },
  { id: "layout3", name: "Dorset County", shortName: "Dorset", description: "Male/open qualifying table", fileType: "pdf", exampleYear: 2025, supportedYears: [ 2025 ], areaCode: "DRSW", areaLabel: "Dorset" },
  { id: "layout4", name: "Hampshire County", shortName: "Hampshire", description: "Female and male, long and short course", fileType: "pdf", exampleYear: 2025, supportedYears: [ 2025 ], areaCode: "HNTS", areaLabel: "Hampshire" },
  { id: "layout5", name: "Oxfordshire & North Bucks", shortName: "Oxfordshire & North Bucks", description: "Accepted and consideration times", fileType: "pdf", exampleYear: 2025, supportedYears: [ 2025 ], areaCode: "ONBS", areaLabel: "Oxfordshire & North Bucks" },
  { id: "layout6", name: "Somerset County", shortName: "Somerset", description: "Female and male qualifying times", fileType: "pdf", exampleYear: 2026, supportedYears: [ 2026 ], areaCode: "SMSW", areaLabel: "Somerset" },
  { id: "layout7", name: "Berkshire & South Bucks", shortName: "Berkshire & South Bucks", description: "Female and male consideration times", fileType: "pdf", exampleYear: 2027, supportedYears: [ 2025, 2027 ], areaCode: "BSBS", areaLabel: "Berkshire & South Bucks" },
  { id: "layout8", name: "London Regional", shortName: "London", description: "Long and short course regional tables", fileType: "pdf", exampleYear: 2025, supportedYears: [ 2025 ], areaCode: "L", areaLabel: "London" },
  { id: "layout9", name: "Cornwall County 2025", shortName: "Cornwall 2025", description: "Female and male qualifying times", fileType: "pdf", exampleYear: 2025, supportedYears: [ 2025 ], areaCode: "CWLW", areaLabel: "Cornwall" },
  { id: "layout10", name: "Cornwall County 2026", shortName: "Cornwall 2026", description: "Qualifying and consideration times", fileType: "pdf", exampleYear: 2026, supportedYears: [ 2026 ], areaCode: "CWLW", areaLabel: "Cornwall" },
  { id: "layout11", name: "Worcestershire County", shortName: "Worcestershire", description: "WCSA championship qualifying times", fileType: "pdf", exampleYear: 2027, supportedYears: [ 2026, 2027 ], areaCode: "WRCM", areaLabel: "Worcester" },
  { id: "layout12", name: "Sussex County", shortName: "Sussex", description: "Open/male and female qualifying times", fileType: "pdf", exampleYear: 2025, supportedYears: [ 2025 ], areaCode: "SSXS", areaLabel: "Sussex" },
  { id: "layout13", name: "Wiltshire County", shortName: "Wiltshire", description: "Wiltshire county qualifying table", fileType: "pdf", exampleYear: 2026, supportedYears: [ 2026, 2027 ], areaCode: "WLTW", areaLabel: "Wiltshire" },
  { id: "layout14", name: "Norfolk County", shortName: "Norfolk", description: "2027 long-course qualifying times", fileType: "pdf", exampleYear: 2027, supportedYears: [ 2027 ], areaCode: "NRFT", areaLabel: "Norfolk" },
  { id: "layout15", name: "Suffolk County", shortName: "Suffolk", description: "Female and open/male table with event in the centre", fileType: "pdf", exampleYear: 2027, supportedYears: [ 2027 ], areaCode: "SFKT", areaLabel: "Suffolk" },
  { id: "layout16", name: "Leicestershire County", shortName: "Leicestershire", description: "Male/open and female 25m entry-time table", fileType: "pdf", exampleYear: 2027, supportedYears: [ 2027 ], areaCode: "LECA", areaLabel: "Leicestershire", defaultCourse: "sc" },
  { id: "layout17", name: "Surrey County", shortName: "Surrey", description: "Qualifying times for both long and short course", fileType: "pdf", exampleYear: 2027, supportedYears: [ 2027 ], areaCode: "SRYQ", areaLabel: "Surrey", defaultCourse: "both" },
  { id: "layout18", name: "Warwickshire County", shortName: "Warwickshire", description: "Female and open/male short-course qualification times", fileType: "pdf", exampleYear: 2027, supportedYears: [ 2027 ], areaCode: "WWKM", areaLabel: "Warwickshire", defaultCourse: "sc" },
  { id: "layout19", name: "Wiltshire County 2027", shortName: "Wiltshire 2027", description: "Female and open/male consideration times arranged by age", fileType: "xlsx", exampleYear: 2027, supportedYears: [ 2027 ], areaCode: "WLTW", areaLabel: "Wiltshire", defaultCourse: "sc" },
  { id: "layout20", name: "Hertfordshire County", shortName: "Hertfordshire", description: "Open and female qualifying-time columns by age", fileType: "pdf", exampleYear: 2027, supportedYears: [ 2027 ], areaCode: "HRTT", areaLabel: "Hertfordshire" },
  { id: "layout21", name: "Northamptonshire County", shortName: "Northamptonshire", description: "Open/male and female 25m qualifying times", fileType: "pdf", exampleYear: 2027, supportedYears: [ 2027 ], areaCode: "NHPA", areaLabel: "Northamptonshire", defaultCourse: "sc" },
  { id: "xlsx", name: "Standard spreadsheet", shortName: "Spreadsheet", description: "Standard XLSX import format", fileType: "xlsx", exampleYear: 2027, supportedYears: [ 2025, 2026, 2027 ], areaCode: null, areaLabel: "All areas" },
]

export const importLayoutById = new Map( importLayoutCatalog.map( layout => [ layout.id, layout ] ) )
