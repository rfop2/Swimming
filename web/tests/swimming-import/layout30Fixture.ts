import { existsSync } from "node:fs"

const localDevonXlsx = String.raw`C:\Users\ange4\OneDrive\Documentos\Import files swimming app 2027\novos docs 2027\2027-Devon-Championship-Qualifying-Times-V1.xlsx`
const wslDevonXlsx = "/mnt/c/Users/ange4/OneDrive/Documentos/Import files swimming app 2027/novos docs 2027/2027-Devon-Championship-Qualifying-Times-V1.xlsx"

export const layout30XlsxPath = [
  process.env.LAYOUT30_XLSX_PATH,
  localDevonXlsx,
  wslDevonXlsx,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout30XlsxPath() {
  if ( !layout30XlsxPath ) {
    throw new Error( "Set LAYOUT30_XLSX_PATH to the Devon 2027 workbook before running this test." )
  }
  return layout30XlsxPath
}
