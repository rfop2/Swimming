import { Swimmer } from "./types.js"

export const DB_DIR = "../db"
export const DB_PATH = `${DB_DIR}/records.db`
export const CACHE_DIR = "./cache"
export const BASE_URL = "https://www.swimmingresults.org"

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

export const MIN_FETCH_INTERVAL = 30
export const MAX_FETCH_INTERVAL = 120

export const individualBaseUrl = "/individualbest/personal_best.php"

export const individualParams = ( swimmer: Swimmer ) => ( {
  mode: "A",
  tiref: swimmer.id,
} )

export const rankBaseUrl = "/12months/last12.php"

export const NATIONALITY = {
  BRITISH:  "A",
  ENGLAND:  "E",
  SCOTLAND:  "S",
  WALES:  "W",
  JERSEY:  "J",
  GUERNSEY:  "G",
  ISLE_OF_MAN:  "I",
  ALL_MEMBERS:  "X",
}

export const REGIONS = {
  "P": "No Region",
  "A": "East Midland",
  "T": "East",
  "L": "London",
  "E": "North East",
  "N": "North West",
  "S": "South East",
  "W": "South West",
  "M": "West Midlands",
  "[NEWATLSM]": "England",
  "X": "Scotland",
  "Y": "Wales",
  "[NE]": "English North Zone",
  "[MAT]": "English Midland Zone",
  "[LSW]": "English South Zone",
  "[MA]": "English Midlands",
}

export const COUNTIES = {
  "XXXX": "No County",
  "BDFT": "Bedfordshire",
  "BSBS": "Berkshire & South Bucks",
  "CMBT": "Cambridgeshire",
  "CHRN": "Cheshire",
  "CWLW": "Cornwall",
  "CUMN": "Cumbria",
  "DRBA": "Derbyshire",
  "DVNW": "Devon",
  "DRSW": "Dorset",
  "SEDX": "East Scotland",
  "ESXQ": "Essex",
  "GLUW": "Gloucester",
  "HNTS": "Hampshire",
  "HRTT": "Hertfordshire",
  "KNTQ": "Kent",
  "LNCN": "Lancashire",
  "LECA": "Leicestershire",
  "LNCA": "Lincolnshire",
  "SMDX": "Mid Scotland",
  "MDXL": "Middlesex",
  "NRFT": "Norfolk",
  "SNDX": "North Scotland",
  "NWAY": "North Wales",
  "NHPA": "Northamptonshire",
  "NDRE": "Northumberland & Durham",
  "NTMA": "Nottinghamshire",
  "ONBS": "Oxfordshire & North Bucks",
  "SHPM": "Shropshire",
  "SMSW": "Somerset",
  "STFM": "Staffordshire",
  "EWAY": "South East Wales",
  "WWAY": "South West Wales",
  "SFKT": "Suffolk",
  "SRYQ": "Surrey",
  "SSXS": "Sussex",
  "WWKM": "Warwickshire",
  "SCWX": "West Scotland",
  "WLTW": "Wiltshire",
  "WRCM": "Worcester",
  "YRKE": "Yorkshire",
}

export const STROKE = {
  FREESTYLE__50M: "1",
  FREESTYLE__100M: "2",
  FREESTYLE__200M: "3",
  FREESTYLE__400M: "4",
  FREESTYLE__800M: "5",
  FREESTYLE__1500M: "6",
  BACKSTROKE__50M: "13",
  BACKSTROKE__100M: "14",
  BACKSTROKE__200M: "15",
  BREASTSTROKE__50M: "7",
  BREASTSTROKE__100M: "8",
  BREASTSTROKE__200M: "9",
  BUTTERFLY__50M: "10",
  BUTTERFLY__100M: "11",
  BUTTERFLY__200M: "12",
  INDIVIDUAL_MEDLEY__100M: "18",
  INDIVIDUAL_MEDLEY__150M: "19",
  INDIVIDUAL_MEDLEY__200M: "16",
  INDIVIDUAL_MEDLEY__400M: "17",
}

export const strokeLookup = Object.fromEntries( Object.entries( STROKE ).map( ( [ k,v ] ) => [ v,k ] ) )

export const strokeSort: Record<string,number> = {
  freestyle: 0,
  breaststroke: 1,
  butterfly: 2,
  backstroke: 3,
  individual_medley: 4
}

export const POOLS = {
  SHORT: "S",
  LONG: "L",
}

export const EVENTS = [
  // Long course
  { stroke_distance: STROKE.FREESTYLE__50M, course: POOLS.LONG },
  { stroke_distance: STROKE.BREASTSTROKE__100M, course: POOLS.LONG },
  { stroke_distance: STROKE.BUTTERFLY__50M, course: POOLS.LONG },
  { stroke_distance: STROKE.BUTTERFLY__100M, course: POOLS.LONG },
  { stroke_distance: STROKE.BACKSTROKE__100M, course: POOLS.LONG },
  // Short course
  { stroke_distance: STROKE.FREESTYLE__50M, course: POOLS.SHORT },
  { stroke_distance: STROKE.FREESTYLE__100M, course: POOLS.SHORT },
  { stroke_distance: STROKE.BREASTSTROKE__50M, course: POOLS.SHORT },
  { stroke_distance: STROKE.BREASTSTROKE__100M, course: POOLS.SHORT },
  { stroke_distance: STROKE.BREASTSTROKE__200M, course: POOLS.SHORT },
  { stroke_distance: STROKE.BUTTERFLY__50M, course: POOLS.SHORT },
  { stroke_distance: STROKE.BUTTERFLY__100M, course: POOLS.SHORT },
  { stroke_distance: STROKE.BACKSTROKE__50M, course: POOLS.SHORT },
  { stroke_distance: STROKE.BACKSTROKE__100M, course: POOLS.SHORT },
  { stroke_distance: STROKE.INDIVIDUAL_MEDLEY__100M, course: POOLS.SHORT },
]

export const globalRankParams = ( swimmer: Swimmer ) => ( {
  Sex: swimmer.gender.substring( 0,1 ).toUpperCase(),
  AgeGroup: swimmer.age,
  date: new Date( new Date().getFullYear(), 11, 31 ).toLocaleDateString( "en-GB" ),
  StartNumber: "1",
  RecordsToView: "100",
  TargetNationality: NATIONALITY.BRITISH,
} )

export const globalRankPage2Params = {
  StartNumber: "101",
}

export const nationalRankParams = {
  Level: "N",
  TargetRegion: "P",
  TargetCounty: "XXXX",
  TargetClub: "XXXX",
}

export const regionalRankParams = {
  Level: "D",
  TargetRegion: "",
  TargetCounty: "XXXX",
  TargetClub: "XXXX",
}

export const countyRankParams = {
  Level: "C",
  TargetRegion: "P",
  TargetCounty: "",
  TargetClub: "XXXX",
}

export const resultsBaseUrl = "/individualbest/personal_best_time_date.php"

export const resultsParams = ( swimmer: Swimmer ) => ( {
  // back: "individualbestname",
  tiref: swimmer.id,
  mode: "A",
} )
