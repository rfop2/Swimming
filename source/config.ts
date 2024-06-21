export const MATCH_NAME = "Eloise Howard"

export const CACHE_DIR = "./cache"
export const BASE_URL = "https://www.swimmingresults.org/"

export const individualBaseUrl = "/individualbest/personal_best.php"

export const individualParams = {
  back: "individualbestname",
  mode: "L",
  name: "Howard",
  tiref: "1660835",
}

export const rankBaseUrl = "/12months/last12.php"

export const globalRankParams = {
  Sex: "F",
  AgeGroup: "11",
  date: "31/12/2024",
  StartNumber: "1",
  RecordsToView: "100",
  TargetNationality: "E",
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

export const freestyle50mShortParams = {
  Pool: POOLS.SHORT,
  Stroke: STROKE.FREESTYLE_50M,
}

export const breaststroke100mShortParams = {
  Pool: POOLS.SHORT,
  Stroke: STROKE.BREASTSTROKE_100M,
}

export const butterfly50mShortParams = {
  Pool: POOLS.SHORT,
  Stroke: STROKE.BUTTERFLY_50M,
}

export const backstroke100mShortParams = {
  Pool: POOLS.SHORT,
  Stroke: STROKE.BACKSTROKE_100M,
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
