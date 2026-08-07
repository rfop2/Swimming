import { existsSync } from "node:fs"

const localWiltshire2027Xlsx = String.raw`C:\Users\ange4\OneDrive\Documentos\Sprint 5 import files\Wiltshire County Qualification Times 2027.xlsx`
const wslWiltshire2027Xlsx = "/mnt/c/Users/ange4/OneDrive/Documentos/Sprint 5 import files/Wiltshire County Qualification Times 2027.xlsx"

export const layout19XlsxPath = [
  process.env.LAYOUT19_XLSX_PATH,
  localWiltshire2027Xlsx,
  wslWiltshire2027Xlsx,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout19XlsxPath() {
  if ( !layout19XlsxPath ) {
    throw new Error( "Set LAYOUT19_XLSX_PATH to the Wiltshire County Qualification Times 2027 XLSX before running this test." )
  }
  return layout19XlsxPath
}
