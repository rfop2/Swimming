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

import { PageData, Swimmer } from "./types.js"

export const createUrl = ( base: string, params: Record<string, string> ) => {
  const url = new URL( BASE_URL + base )
  url.search = new URLSearchParams( params ).toString()
  return url
}

const getPages = ( swimmer: Swimmer ) => {
  const pages: PageData = [
    {
      label: `individual_${swimmer.id}`,
      url: createUrl( individualBaseUrl, individualParams( swimmer ) ),
      type: "individual"
    },
    {
      label: `50m_freestyle_${swimmer.gender}_lc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.LONG },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_freestyle_${swimmer.gender}_lc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.LONG },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_freestyle_${swimmer.gender}_lc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.LONG },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_breaststroke_${swimmer.gender}_lc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.LONG },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_breaststroke_${swimmer.gender}_lc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.LONG },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_breaststroke_${swimmer.gender}_lc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.LONG },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_butterfly_${swimmer.gender}_lc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.LONG },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_butterfly_${swimmer.gender}_lc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.LONG },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_butterfly_${swimmer.gender}_lc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.LONG },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_backstroke_${swimmer.gender}_lc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.LONG },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_backstroke_${swimmer.gender}_lc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.LONG },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_backstroke_${swimmer.gender}_lc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.LONG },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_freestyle_${swimmer.gender}_sc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_freestyle_${swimmer.gender}_sc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_freestyle_${swimmer.gender}_sc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.FREESTYLE_50M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_freestyle_${swimmer.gender}_sc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.FREESTYLE_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_freestyle_${swimmer.gender}_sc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.FREESTYLE_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_freestyle_${swimmer.gender}_sc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.FREESTYLE_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_breaststroke_${swimmer.gender}_sc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BREASTSTROKE_50M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_breaststroke_${swimmer.gender}_sc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BREASTSTROKE_50M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_breaststroke_${swimmer.gender}_sc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BREASTSTROKE_50M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_breaststroke_${swimmer.gender}_sc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_breaststroke_${swimmer.gender}_sc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_breaststroke_${swimmer.gender}_sc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BREASTSTROKE_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `200m_breaststroke_${swimmer.gender}_sc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BREASTSTROKE_200M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `200m_breaststroke_${swimmer.gender}_sc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BREASTSTROKE_200M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `200m_breaststroke_${swimmer.gender}_sc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BREASTSTROKE_200M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_butterfly_${swimmer.gender}_sc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_butterfly_${swimmer.gender}_sc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_butterfly_${swimmer.gender}_sc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BUTTERFLY_50M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_butterfly_${swimmer.gender}_sc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BUTTERFLY_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_butterfly_${swimmer.gender}_sc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BUTTERFLY_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_butterfly_${swimmer.gender}_sc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BUTTERFLY_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_backstroke_${swimmer.gender}_sc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BACKSTROKE_50M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_backstroke_${swimmer.gender}_sc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BACKSTROKE_50M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_backstroke_${swimmer.gender}_sc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BACKSTROKE_50M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_backstroke_${swimmer.gender}_sc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_backstroke_${swimmer.gender}_sc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_backstroke_${swimmer.gender}_sc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.BACKSTROKE_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_individual_medley_${swimmer.gender}_sc_${swimmer.age}`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.INDIVIDUAL_MEDLEY_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_individual_medley_${swimmer.gender}_sc_${swimmer.age}_sw`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.INDIVIDUAL_MEDLEY_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...regionalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `100m_individual_medley_${swimmer.gender}_sc_${swimmer.age}_glos`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: STROKE.INDIVIDUAL_MEDLEY_100M, Pool: POOLS.SHORT },
        ...globalRankParams( swimmer ),
        ...countyRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `50m_freestyle_lc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.FREESTYLE_50M, tcourse: POOLS.LONG },
      } ),
      type: "results"
    },
    {
      label: `100m_breaststroke_lc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.BREASTSTROKE_100M, tcourse: POOLS.LONG },
      } ),
      type: "results"
    },
    {
      label: `50m_butterfly_lc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.BUTTERFLY_50M, tcourse: POOLS.LONG },
      } ),
      type: "results"
    },
    {
      label: `100m_backstroke_lc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.BACKSTROKE_100M, tcourse: POOLS.LONG },
      } ),
      type: "results"
    },
    {
      label: `50m_freestyle_sc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.FREESTYLE_50M, tcourse: POOLS.SHORT },
      } ),
      type: "results"
    },
    {
      label: `100m_freestyle_sc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.FREESTYLE_100M, tcourse: POOLS.SHORT },
      } ),
      type: "results"
    },
    {
      label: `50m_breaststroke_sc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.BREASTSTROKE_50M, tcourse: POOLS.SHORT },
      } ),
      type: "results"
    },
    {
      label: `100m_breaststroke_sc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.BREASTSTROKE_100M, tcourse: POOLS.SHORT },
      } ),
      type: "results"
    },
    {
      label: `200m_breaststroke_sc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.BREASTSTROKE_200M, tcourse: POOLS.SHORT },
      } ),
      type: "results"
    },
    {
      label: `50m_butterfly_sc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.BUTTERFLY_50M, tcourse: POOLS.SHORT },
      } ),
      type: "results"
    },
    {
      label: `100m_butterfly_sc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.BUTTERFLY_100M, tcourse: POOLS.SHORT },
      } ),
      type: "results"
    },
    {
      label: `50m_backstroke_sc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.BACKSTROKE_50M, tcourse: POOLS.SHORT },
      } ),
      type: "results"
    },
    {
      label: `100m_backstroke_sc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.BACKSTROKE_100M, tcourse: POOLS.SHORT },
      } ),
      type: "results"
    },
    {
      label: `100m_individual_medley_sc_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: STROKE.INDIVIDUAL_MEDLEY_100M, tcourse: POOLS.SHORT },
      } ),
      type: "results"
    },
  ]
  return pages
}

export const extendedPages = ( swimmer: Swimmer ) => {
  // Add second page for national rankings
  const pages = getPages( swimmer )
  const extPages = []
  for ( const page of pages ) {
    extPages.push( page )
    if ( page.type === "ranking" ) {
      const url = new URL( page.url )
      const params = url.searchParams
      if ( params.get( "Level" ) === "N" ) {
        params.set( "StartNumber", "101" )
        url.search = new URLSearchParams( params ).toString()
        extPages.push( Object.assign( {}, page, { label: `${page.label}-2`, url } ) )
      }
    }
  }
  return extPages
}
