import { existsSync } from "node:fs"

const localHertfordshireXlsx = String.raw`C:\Users\ange4\OneDrive\Documentos\Import files swimming app 2027\novos docs 2027\SEH County Championships 2027 Qualifying and Consideration times v1 (1).xlsx`
const wslHertfordshireXlsx = "/mnt/c/Users/ange4/OneDrive/Documentos/Import files swimming app 2027/novos docs 2027/SEH County Championships 2027 Qualifying and Consideration times v1 (1).xlsx"

export const layout27XlsxPath = [
  process.env.LAYOUT27_XLSX_PATH,
  localHertfordshireXlsx,
  wslHertfordshireXlsx,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout27XlsxPath() {
  if ( !layout27XlsxPath ) {
    throw new Error( "Set LAYOUT27_XLSX_PATH to the Hertfordshire SEH County Championships 2027 workbook before running this test." )
  }
  return layout27XlsxPath
}
