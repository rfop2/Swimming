import { existsSync } from "node:fs"

const localCambridgeshireXlsx = String.raw`C:\Users\ange4\OneDrive\Documentos\Import files swimming app 2027\novos docs 2027\2026 SECC QTCT.xlsx`
const wslCambridgeshireXlsx = "/mnt/c/Users/ange4/OneDrive/Documentos/Import files swimming app 2027/novos docs 2027/2026 SECC QTCT.xlsx"

export const layout26XlsxPath = [
  process.env.LAYOUT26_XLSX_PATH,
  localCambridgeshireXlsx,
  wslCambridgeshireXlsx,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout26XlsxPath() {
  if ( !layout26XlsxPath ) {
    throw new Error( "Set LAYOUT26_XLSX_PATH to the Cambridgeshire 2026 SECC QTCT workbook before running this test." )
  }
  return layout26XlsxPath
}
