import { existsSync } from "node:fs"

const localHertfordshire2027Xlsx = String.raw`C:\Users\ange4\OneDrive\Documentos\Import files swimming app 2027\novos docs 2027\SEH County Championships 2027 Qualifying and Consideration times v1 (1).xlsx`
const wslHertfordshire2027Xlsx = "/mnt/c/Users/ange4/OneDrive/Documentos/Import files swimming app 2027/novos docs 2027/SEH County Championships 2027 Qualifying and Consideration times v1 (1).xlsx"

export const layout24XlsxPath = [
  process.env.LAYOUT24_XLSX_PATH,
  localHertfordshire2027Xlsx,
  wslHertfordshire2027Xlsx,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout24XlsxPath() {
  if ( !layout24XlsxPath ) {
    throw new Error( "Set LAYOUT24_XLSX_PATH to the Hertfordshire 2027 XLSX before running this test." )
  }
  return layout24XlsxPath
}
