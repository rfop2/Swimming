import { existsSync } from "node:fs"

const localSurrey2027Pdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Sprint 5 import files\Surrey - Qualifying-and-Consideration-Times-2027-v1.pdf`
const wslSurrey2027Pdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Sprint 5 import files/Surrey - Qualifying-and-Consideration-Times-2027-v1.pdf"

export const layout17PdfPath = [
  process.env.LAYOUT17_PDF_PATH,
  localSurrey2027Pdf,
  wslSurrey2027Pdf,
].find( candidate => candidate && existsSync( candidate ) )

export function requireLayout17PdfPath() {
  if ( !layout17PdfPath ) {
    throw new Error(
      "Set LAYOUT17_PDF_PATH to the Surrey Qualifying and Consideration Times 2027 PDF before running this test."
    )
  }
  return layout17PdfPath
}
