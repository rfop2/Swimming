import { describe, expect, it } from "vitest"
import { detectImportLayout } from "../../server/utils/swimming-import/detectLayout"

describe( "detectImportLayout", () => {
  it( "detects Suffolk, its year and qualifying start date", () => {
    const result = detectImportLayout(
      "Swim England Suffolk County Championship Qualifying Times 2027 Open/Male Times should have been swum since 1st January 2026",
      "Suffolk Swimming Qualifying Times 2027.pdf",
      "pdf"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout15",
      suggestedLayoutName: "Suffolk County",
      confidence: "high",
      detectedYear: 2027,
      dates: { qualifyingStart: "2026-01-01" },
    } )
  } )

  it( "distinguishes the Norfolk 2027 layout from the legacy Norfolk layout", () => {
    const result = detectImportLayout(
      "Swim England Norfolk County Championships 2027 Female Long Course QT Open / Male Long Course QT",
      "Norfolk Swimming Qualifying Times 2027.pdf",
      "pdf"
    )

    expect( result.suggestedLayoutId ).toBe( "layout14" )
    expect( result.confidence ).toBe( "high" )
  } )

  it( "detects the Leicestershire 2027 entry-time layout", () => {
    const result = detectImportLayout(
      "2027 LEICESTERSHIRE AGE GROUPS AND CHAMPIONSHIPS ENTRY TIMES Male Open Entry Time 25m Female",
      "Leicestershire Swimming Qualifying Times 2027.pdf",
      "pdf"
    )

    expect( result.suggestedLayoutId ).toBe( "layout16" )
    expect( result.suggestedLayoutName ).toBe( "Leicestershire County" )
    expect( result.confidence ).toBe( "high" )
    expect( result.detectedYear ).toBe( 2027 )
  } )

  it( "detects the Surrey 2027 qualifying and consideration document", () => {
    const result = detectImportLayout(
      "Surrey County Age Group Championships 2027 Qualifying and Consideration Times County Qualifying Times, Long Course Pool",
      "Surrey - Qualifying-and-Consideration-Times-2027-v1.pdf",
      "pdf"
    )

    expect( result.suggestedLayoutId ).toBe( "layout17" )
    expect( result.suggestedLayoutName ).toBe( "Surrey County" )
    expect( result.confidence ).toBe( "high" )
    expect( result.detectedYear ).toBe( 2027 )
  } )

  it( "detects Warwickshire and its qualification date range", () => {
    const result = detectImportLayout(
      "Warwickshire County Championships 2027 Qualification Times Times to be achieved from 1st January 2026 - 20th December 2026 Short Course Times or converted Long Course",
      "Warwickshire Swimming Qualifying Times 2027.pdf",
      "pdf"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout18",
      suggestedLayoutName: "Warwickshire County",
      confidence: "high",
      detectedYear: 2027,
      dates: {
        qualifyingStart: "2026-01-01",
        qualifyingEnd: "2026-12-20",
      },
    } )
  } )

  it( "falls back to manual selection when no signature matches", () => {
    const result = detectImportLayout( "Unknown swimming document", "unknown.pdf", "pdf" )
    expect( result.suggestedLayoutId ).toBeNull()
    expect( result.compatibleLayoutIds ).toEqual( [] )
  } )

  it( "selects the spreadsheet importer for XLSX files", () => {
    const result = detectImportLayout( "", "qualifying-times-2027.xlsx", "xlsx" )
    expect( result.suggestedLayoutId ).toBe( "xlsx" )
    expect( result.confidence ).toBe( "high" )
    expect( result.detectedYear ).toBe( 2027 )
  } )

  it( "detects the Wiltshire 2027 spreadsheet and its general qualifying window", () => {
    const result = detectImportLayout(
      "Wiltshire Swimming Championship and Age Group Consideration Times - 2027 - Age on 31/12/27 All times are 25m Times must have been swum between 16/05/26 and 16/12/26",
      "Wiltshire County Qualification Times 2027.xlsx",
      "xlsx"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout19",
      suggestedLayoutName: "Wiltshire County 2027",
      confidence: "high",
      detectedYear: 2027,
      dates: {
        qualifyingStart: "2026-05-16",
        qualifyingEnd: "2026-12-16",
      },
    } )
  } )

  it( "detects Hertfordshire and its qualifying window", () => {
    const result = detectImportLayout(
      "Swim England Hertfordshire County Championships 2027 Qualifying and Consideration Times Qualifying window : 16th May - 6th December 2026 (inclusive)",
      "Hertfordshire Swimming Qualifying Times 2027.pdf",
      "pdf"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout20",
      suggestedLayoutName: "Hertfordshire County",
      confidence: "high",
      detectedYear: 2027,
      dates: {
        qualifyingStart: "2026-05-16",
        qualifyingEnd: "2026-12-06",
      },
    } )
  } )

  it( "detects Northamptonshire and its qualifying start date", () => {
    const result = detectImportLayout(
      "Northamptonshire ASA - County Championships 2027 Qualifying Times All times displayed above are in 25m format. Qualifiying times must be achieved at a licensed event since 1st January 2026.",
      "Northamptonshire ASA - County 2027 Times.pdf",
      "pdf"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout21",
      suggestedLayoutName: "Northamptonshire County",
      confidence: "high",
      detectedYear: 2027,
      dates: { qualifyingStart: "2026-01-01" },
    } )
  } )

  it( "detects Lancashire and its qualifying window", () => {
    const result = detectImportLayout(
      "Lancashire County Water Polo & Swimming Association Age Groups and Championships 2027 Consideration Times Short Course All times must have been achieved between 9th February 2026 and13th January 2027",
      "Lancashire County Times 2027.pdf",
      "pdf"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout22",
      suggestedLayoutName: "Lancashire County",
      confidence: "high",
      detectedYear: 2027,
      dates: {
        qualifyingStart: "2026-02-09",
        qualifyingEnd: "2027-01-13",
      },
    } )
  } )

  it( "detects Cumbria and its qualifying window", () => {
    const result = detectImportLayout(
      "Cumbria County Championships 2027 (CC27) Short Course Qualifying Times Times to be achieved from 9th February 2026 until 5th January 2027 This meet uses LLT (Lower Limit Time) Qualifying Times",
      "Cumbria 27-Qualifying-Times-FINAL-v2.pdf",
      "pdf"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout23",
      suggestedLayoutName: "Cumbria County",
      confidence: "high",
      detectedYear: 2027,
      dates: {
        qualifyingStart: "2026-02-09",
        qualifyingEnd: "2027-01-05",
      },
    } )
  } )

  it( "detects the South West Winter regional image-based PDF and applies its confirmed metadata", () => {
    const result = detectImportLayout(
      "All entries must be made from times on the rankings database from Level 1, 2 or 3 events since the 3rd November 2025.",
      "South West QT.pdf",
      "pdf"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout25",
      suggestedLayoutName: "South West Winter Regional 2026",
      confidence: "high",
      detectedYear: 2026,
      dates: {
        qualifyingStart: "2025-11-03",
        qualifyingEnd: "2026-10-18",
        lastRaceDate: null,
      },
    } )
  } )

  it( "detects the Cambridgeshire QT/CT spreadsheet and applies its confirmed 2027 metadata", () => {
    const result = detectImportLayout(
      "Cambridgeshire County Championships Qualifying Times 2026 ALL ENTRIES MUST INCLUDE A TIME WHICH IS EQUAL TO OR FASTER THAN QT or CT Qualification time Consideration time",
      "2026 SECC QTCT.xlsx",
      "xlsx"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout26",
      suggestedLayoutName: "Cambridgeshire County 2027",
      confidence: "high",
      detectedYear: 2027,
      dates: {
        qualifyingStart: "2026-01-01",
        qualifyingEnd: "2027-01-06",
        lastRaceDate: null,
      },
    } )
  } )

  it( "detects the Hertfordshire QT/CT workbook and its qualifying window", () => {
    const result = detectImportLayout(
      "OPEN/MALE FEMALE QT CT Qualifying and Consideration Times Qualifying window : 16th May - 6th December 2026 (inclusive)",
      "SEH County Championships 2027 Qualifying and Consideration times v1.xlsx",
      "xlsx"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout27",
      suggestedLayoutName: "Hertfordshire County 2027 (Excel)",
      confidence: "high",
      detectedYear: 2027,
      dates: {
        qualifyingStart: "2026-05-16",
        qualifyingEnd: "2026-12-06",
        lastRaceDate: null,
      },
    } )
  } )

  it( "detects the Staffordshire PDF and applies the confirmed import dates", () => {
    const result = detectImportLayout(
      "County Qualifying Times 2027 Male/Open Female 10/11 12 13 14 15 16 17/Over Event",
      "Staffordshire QT_2027_15Sep26.pdf",
      "pdf"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout28",
      suggestedLayoutName: "Staffordshire County 2027",
      confidence: "high",
      detectedYear: 2027,
      dates: {
        qualifyingStart: "2026-04-01",
        qualifyingEnd: "2027-01-13",
        lastRaceDate: null,
      },
    } )
  } )

  it( "detects the Cornwall 2027 PDF and applies its confirmed import dates", () => {
    const result = detectImportLayout(
      "Cornwall County Champs 2027 Qualifying and Consideration Times V2.1_30.08.2026 Times must have been achieved since 01/03/ 2026",
      "Cornwall-County-Champs-2027-QTs_V2.1_30082026.pdf",
      "pdf"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout29",
      suggestedLayoutName: "Cornwall County 2027",
      confidence: "high",
      detectedYear: 2027,
      dates: {
        qualifyingStart: "2026-03-01",
        qualifyingEnd: "2027-01-16",
        lastRaceDate: null,
      },
    } )
  } )

  it( "detects the Devon workbook and applies both-course import metadata", () => {
    const result = detectImportLayout(
      "DEVON COUNTY ASA 2027 CONSIDERATION TIMES Open / Male 2027 Times Female 2027 Times Entry times to have been achieved since 1st March 2026 Entries close 16th December 2026",
      "2027-Devon-Championship-Qualifying-Times-V1.xlsx",
      "xlsx"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout30",
      suggestedLayoutName: "Devon County 2027",
      confidence: "high",
      detectedYear: 2027,
      dates: {
        qualifyingStart: "2026-03-01",
        qualifyingEnd: "2026-12-16",
        lastRaceDate: null,
      },
    } )
  } )

  it( "detects the Cheshire PDF and applies its confirmed import dates", () => {
    const result = detectImportLayout(
      "Cheshire County W.P. & S.A. Swimming Championships 2027 CONSIDERATION Times Times to have been achieved since 1st January 2026 at Licensed Meets",
      "Cheshire County 2027 Consideration Times.pdf",
      "pdf"
    )

    expect( result ).toMatchObject( {
      suggestedLayoutId: "layout31",
      suggestedLayoutName: "Cheshire County 2027",
      confidence: "high",
      detectedYear: 2027,
      dates: {
        qualifyingStart: "2026-01-01",
        qualifyingEnd: "2026-12-09",
        lastRaceDate: null,
      },
    } )
  } )
} )
