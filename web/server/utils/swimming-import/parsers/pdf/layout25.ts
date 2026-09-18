import type { ImportEvent } from "../../types"

type SourceRow = {
  distance: string
  stroke: string
  male: [ string, string, string, string ]
  female: [ string, string, string, string ]
}

const ageGroups = [
  { ages: [ "13", "14" ], column: 0 },
  { ages: [ "15" ], column: 1 },
  { ages: [ "16" ], column: 2 },
  { ages: [ "17+" ], column: 3 },
] as const

// The table in South West QT.pdf is a raster image and contains no extractable PDF text.
// These values are transcribed from the source table; the parser still validates the
// document's extractable footer so a different PDF cannot silently use this fixed dataset.
const sourceRows: SourceRow[] = [
  { distance: "50m", stroke: "Freestyle", male: [ "27.30", "27.00", "25.60", "25.00" ], female: [ "29.00", "28.70", "28.00", "27.50" ] },
  { distance: "100m", stroke: "Freestyle", male: [ "59.90", "58.90", "56.60", "54.00" ], female: [ "1:04.00", "1:02.50", "1:02.00", "59.50" ] },
  { distance: "200m", stroke: "Freestyle", male: [ "2:11.00", "2:09.50", "2:02.50", "1:58.00" ], female: [ "2:21.00", "2:15.00", "2:13.50", "2:12.00" ] },
  { distance: "400m", stroke: "Freestyle", male: [ "4:40.50", "4:36.00", "4:23.00", "4:12.00" ], female: [ "4:54.50", "4:46.00", "4:45.00", "4:39.00" ] },
  { distance: "800m", stroke: "Freestyle", male: [ "09:39.00", "09:15.00", "09:12.00", "08:50.00" ], female: [ "10:15.00", "10:00.00", "10:00.00", "09:45.00" ] },
  { distance: "1500m", stroke: "Freestyle", male: [ "18:33.00", "18:00.00", "17:55.00", "17:20.00" ], female: [ "19:51.50", "19:15.00", "19:15.00", "18:38.00" ] },
  { distance: "50m", stroke: "Backstroke", male: [ "32.00", "31.00", "30.00", "29.50" ], female: [ "33.40", "33.00", "32.00", "31.00" ] },
  { distance: "100m", stroke: "Backstroke", male: [ "1:09.70", "1:08.00", "1:04.50", "1:01.00" ], female: [ "1:12.50", "1:11.80", "1:09.40", "1:06.70" ] },
  { distance: "200m", stroke: "Backstroke", male: [ "2:30.00", "2:23.00", "2:18.00", "2:15.00" ], female: [ "2:37.00", "2:35.00", "2:33.50", "2:23.50" ] },
  { distance: "50m", stroke: "Breaststroke", male: [ "36.00", "34.00", "33.20", "32.00" ], female: [ "37.20", "37.00", "36.50", "35.50" ] },
  { distance: "100m", stroke: "Breaststroke", male: [ "1:18.20", "1:16.50", "1:13.50", "1:10.00" ], female: [ "1:21.50", "1:21.00", "1:20.00", "1:17.50" ] },
  { distance: "200m", stroke: "Breaststroke", male: [ "2:51.50", "2:51.00", "2:50.00", "2:39.00" ], female: [ "2:56.00", "2:56.00", "2:55.00", "2:52.00" ] },
  { distance: "50m", stroke: "Butterfly", male: [ "30.00", "29.30", "28.50", "27.00" ], female: [ "31.60", "31.10", "30.50", "30.00" ] },
  { distance: "100m", stroke: "Butterfly", male: [ "1:07.00", "1:07.00", "1:05.00", "59.50" ], female: [ "1:13.00", "1:11.50", "1:10.50", "1:06.50" ] },
  { distance: "200m", stroke: "Butterfly", male: [ "2:34.00", "2:34.00", "2:28.00", "2:15.00" ], female: [ "2:48.00", "2:44.00", "2:42.00", "2:40.00" ] },
  { distance: "100m", stroke: "Individual Medley", male: [ "1:09.00", "1:07.00", "1:04.50", "1:02.00" ], female: [ "1:12.50", "1:12.50", "1:11.00", "1:08.00" ] },
  { distance: "200m", stroke: "Individual Medley", male: [ "2:29.00", "2:28.00", "2:19.50", "2:14.50" ], female: [ "2:37.50", "2:36.00", "2:33.00", "2:27.00" ] },
  { distance: "400m", stroke: "Individual Medley", male: [ "5:20.00", "5:15.00", "5:05.00", "5:00.00" ], female: [ "5:32.00", "5:30.00", "5:29.00", "5:25.00" ] },
]

export function parseSwimmingPdfLayout25( text: string ): ImportEvent[] {
  const normalized = text.toLowerCase().replace( /\s+/g, " " )
  if ( !normalized.includes( "all entries must be made from times on the rankings database" ) ||
    !normalized.includes( "3rd november 2025" ) ||
    !normalized.includes( "the region reserves the right to reject swimmers with a consideration time" ) ) return []

  const rows: ImportEvent[] = []

  for ( const source of sourceRows ) {
    const event = `${source.stroke} ${source.distance}`
    for ( const { ages, column } of ageGroups ) {
      for ( const age of ages ) {
        rows.push( { gender: "male", course: "sc", event, distance: source.distance, stroke: source.stroke, age, time: source.male[column] } )
        rows.push( { gender: "female", course: "sc", event, distance: source.distance, stroke: source.stroke, age, time: source.female[column] } )
      }
    }
  }

  return rows
}
