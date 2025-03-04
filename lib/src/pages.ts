import {
  BASE_URL,
  EVENTS,
  countyRankParams,
  globalRankParams,
  individualBaseUrl,
  individualParams,
  nationalRankParams,
  rankBaseUrl,
  regionalRankParams,
  resultsBaseUrl,
  resultsParams,
  strokeLookup,
} from "./config.js"

import { PageData, Swimmer } from "./types.js"

export const createUrl = ( base: string, params: Record<string, string> ) => {
  const url = new URL( BASE_URL + base )
  url.search = new URLSearchParams( params ).toString()
  return url
}

const getEventPages = ( swimmer: Swimmer, stroke_distance: string, course: string ) => {
  const [ stroke, distance ] = strokeLookup[stroke_distance].toLocaleLowerCase().split( "__" )
  const pages: PageData = [
    {
      label: `${distance}_${stroke}_${course.toLocaleLowerCase()}c_${swimmer.id}`,
      url: createUrl( resultsBaseUrl, {
        ...resultsParams( swimmer ),
        ...{ tstroke: stroke_distance, tcourse: course },
      } ),
      type: "results"
    },
    {
      label: `${distance}_${stroke}_${swimmer.gender}_${course.toLocaleLowerCase()}c_${swimmer.age}_national`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: stroke_distance, Pool: course },
        ...globalRankParams( swimmer ),
        ...nationalRankParams,
      } ),
      type: "ranking"
    },
    {
      label: `${distance}_${stroke}_${swimmer.gender}_${course.toLocaleLowerCase()}c_${swimmer.age}_regional`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: stroke_distance, Pool: course },
        ...globalRankParams( swimmer ),
        ...{ ...regionalRankParams, ...{ TargetRegion: swimmer.region } }
      } ),
      type: "ranking"
    },
    {
      label: `${distance}_${stroke}_${swimmer.gender}_${course.toLocaleLowerCase()}c_${swimmer.age}_county`,
      url: createUrl( rankBaseUrl, {
        ...{ Stroke: stroke_distance, Pool: course },
        ...globalRankParams( swimmer ),
        ...{ ...countyRankParams, ...{ TargetCounty: swimmer.county } }
      } ),
      type: "ranking"
    },
  ]
  return pages
}

const getPages = ( swimmer: Swimmer ) => {
  const pages: PageData = [
    {
      label: `individual_${swimmer.id}`,
      url: createUrl( individualBaseUrl, individualParams( swimmer ) ),
      type: "individual"
    },
  ]
  for ( const event of EVENTS ) {
    pages.push( ...getEventPages( swimmer, event.stroke_distance, event.course ) )
  }
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
        // TODO - Make number of pages dynamic
        params.set( "StartNumber", "101" )
        url.search = new URLSearchParams( params ).toString()
        extPages.push( Object.assign( {}, page, { label: `${page.label}-2`, url } ) )
      }
    }
  }
  return extPages
}
