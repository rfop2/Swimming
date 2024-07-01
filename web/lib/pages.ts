import {
  BASE_URL,
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
    label: "50m_freestyle_female_lc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_freestyle_female_lc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_freestyle_female_lc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_breaststroke_female_lc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_breaststroke_female_lc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_breaststroke_female_lc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_butterfly_female_lc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_butterfly_female_lc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_butterfly_female_lc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_backstroke_female_lc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_backstroke_female_lc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_backstroke_female_lc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.LONG },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_freestyle_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_freestyle_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_freestyle_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_freestyle_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_freestyle_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_freestyle_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.FREESTYLE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_breaststroke_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_breaststroke_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_breaststroke_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_breaststroke_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_breaststroke_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_breaststroke_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_butterfly_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_butterfly_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_butterfly_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_butterfly_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_butterfly_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_butterfly_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BUTTERFLY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_backstroke_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_backstroke_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "50m_backstroke_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_50M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_backstroke_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_backstroke_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_backstroke_female_sc_11_glos",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...countyRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_individual_medley_female_sc_11",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.INDIVIDUAL_MEDLEY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...nationalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_individual_medley_female_sc_11_sw",
    url: createUrl( rankBaseUrl, {
      ...{ Stroke: STROKE.INDIVIDUAL_MEDLEY_100M, Pool: POOLS.SHORT },
      ...globalRankParams,
      ...regionalRankParams,
    } ),
    type: "ranking"
  },
  {
    label: "100m_individual_medley_female_sc_11_glos",
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
