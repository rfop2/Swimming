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

export const POOLS = {
  SHORT: "S",
  LONG: "L",
}

export const STROKE = {
  FREESTYLE_50M: "1",
  FREESTYLE_100M: "2",
  FREESTYLE_200M: "3",
  FREESTYLE_400M: "4",
  FREESTYLE_800M: "5",
  FREESTYLE_1500M: "6",
  BACKSTROKE_50M: "13",
  BACKSTROKE_100M: "14",
  BACKSTROKE_200M: "15",
  BREASTSTROKE_50M: "7",
  BREASTSTROKE_100M: "8",
  BREASTSTROKE_200M: "9",
  BUTTERFLY_50M: "10",
  BUTTERFLY_100M: "11",
  BUTTERFLY_200M: "12",
  INDIVIDUAL_MEDLEY_100M: "18",
  INDIVIDUAL_MEDLEY_150M: "19",
  INDIVIDUAL_MEDLEY_200M: "16",
  INDIVIDUAL_MEDLEY_400M: "17",
}

export const strokeSort: Record<string,number> = {
  freestyle: 0,
  breaststroke: 1,
  butterfly: 2,
  backstroke: 3,
  individual_medley: 4
}

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
  TargetRegion: "P",
  Level: "N",
  TargetCounty: "XXXX",
  TargetClub: "XXXX",
}

export const regionalRankParams = {
  TargetRegion: "W",
  Level: "D",
  TargetCounty: "XXXX",
  TargetClub: "XXXX",
}

export const countyRankParams = {
  TargetRegion: "P",
  Level: "C",
  TargetCounty: "GLUW",
  TargetClub: "XXXX",
}

export const resultsBaseUrl = "/individualbest/personal_best_time_date.php"

export const resultsParams = ( swimmer: Swimmer ) => ( {
  // back: "individualbestname",
  tiref: swimmer.id,
  mode: "A",
} )
