import {
  BASE_URL,
  GENDER,
  AGE,
  STROKE,
  POOLS,
  countyRankParams,
  globalRankParams,
  individualBaseUrl,
  individualParams,
  nationalRankParams,
  rankBaseUrl,
  regionalRankParams,
  resultsBaseUrl,
  resultsParams,
} from "./config.js"

import { PageData } from "./types.js"

export const createUrl = ( base: string, params: Record<string, string> ) => {
  const url = new URL( BASE_URL + base )
  url.search = new URLSearchParams( params ).toString()
  return url
}

export const pages: PageData = [
  {
    label: "individual",
    url: createUrl( individualBaseUrl, individualParams ),
    type: "individual"
  },
  {
    label: `50m_freestyle_${GENDER}_lc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_freestyle_${GENDER}_lc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_freestyle_${GENDER}_lc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_breaststroke_${GENDER}_lc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_breaststroke_${GENDER}_lc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_breaststroke_${GENDER}_lc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_butterfly_${GENDER}_lc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_butterfly_${GENDER}_lc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_butterfly_${GENDER}_lc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_backstroke_${GENDER}_lc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_backstroke_${GENDER}_lc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_backstroke_${GENDER}_lc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_freestyle_${GENDER}_sc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_freestyle_${GENDER}_sc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_freestyle_${GENDER}_sc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_freestyle_${GENDER}_sc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_freestyle_${GENDER}_sc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_freestyle_${GENDER}_sc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_breaststroke_${GENDER}_sc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_breaststroke_${GENDER}_sc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_breaststroke_${GENDER}_sc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_breaststroke_${GENDER}_sc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_breaststroke_${GENDER}_sc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_breaststroke_${GENDER}_sc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `200m_breaststroke_${GENDER}_sc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_200M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `200m_breaststroke_${GENDER}_sc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_200M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `200m_breaststroke_${GENDER}_sc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_200M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_butterfly_${GENDER}_sc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_butterfly_${GENDER}_sc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_butterfly_${GENDER}_sc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_butterfly_${GENDER}_sc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_butterfly_${GENDER}_sc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_butterfly_${GENDER}_sc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_backstroke_${GENDER}_sc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_backstroke_${GENDER}_sc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `50m_backstroke_${GENDER}_sc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_backstroke_${GENDER}_sc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_backstroke_${GENDER}_sc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_backstroke_${GENDER}_sc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_individual_medley_${GENDER}_sc_${AGE}`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.INDIVIDUAL_MEDLEY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_individual_medley_${GENDER}_sc_${AGE}_sw`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.INDIVIDUAL_MEDLEY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: `100m_individual_medley_${GENDER}_sc_${AGE}_glos`,
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.INDIVIDUAL_MEDLEY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_freestyle_lc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.FREESTYLE_50M, tcourse: POOLS.LONG },
    } ),
    type: "results"
  },
  {
    label: "100m_breaststroke_lc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.BREASTSTROKE_100M, tcourse: POOLS.LONG },
    } ),
    type: "results"
  },
  {
    label: "50m_butterfly_lc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.BUTTERFLY_50M, tcourse: POOLS.LONG },
    } ),
    type: "results"
  },
  {
    label: "100m_backstroke_lc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.BACKSTROKE_100M, tcourse: POOLS.LONG },
    } ),
    type: "results"
  },
  {
    label: "50m_freestyle_sc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.FREESTYLE_50M, tcourse: POOLS.SHORT },
    } ),
    type: "results"
  },
  {
    label: "100m_freestyle_sc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.FREESTYLE_100M, tcourse: POOLS.SHORT },
    } ),
    type: "results"
  },
  {
    label: "100m_breaststroke_sc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.BREASTSTROKE_100M, tcourse: POOLS.SHORT },
    } ),
    type: "results"
  },
  {
    label: "50m_breaststroke_sc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.BREASTSTROKE_50M, tcourse: POOLS.SHORT },
    } ),
    type: "results"
  },
  {
    label: "50m_butterfly_sc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.BUTTERFLY_50M, tcourse: POOLS.SHORT },
    } ),
    type: "results"
  },
  {
    label: "100m_butterfly_sc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.BUTTERFLY_100M, tcourse: POOLS.SHORT },
    } ),
    type: "results"
  },
  {
    label: "50m_backstroke_sc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.BACKSTROKE_50M, tcourse: POOLS.SHORT },
    } ),
    type: "results"
  },
  {
    label: "100m_backstroke_sc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.BACKSTROKE_100M, tcourse: POOLS.SHORT },
    } ),
    type: "results"
  },
  {
    label: "100m_individual_medley_sc",
    url: createUrl( resultsBaseUrl, {
      ...resultsParams,
      ...{ tstroke: STROKE.INDIVIDUAL_MEDLEY_100M, tcourse: POOLS.SHORT },
    } ),
    type: "results"
  },
]
