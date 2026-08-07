import { existsSync } from "node:fs"

const localSuffolk2027Pdf = String.raw`C:\Users\ange4\OneDrive\Documentos\Sprint 5 import files\Suffolk Swimming Qualifying Times 2027.pdf`
const wslSuffolk2027Pdf = "/mnt/c/Users/ange4/OneDrive/Documentos/Sprint 5 import files/Suffolk Swimming Qualifying Times 2027.pdf"

export const layout15PdfPath = [
  process.env.LAYOUT15_PDF_PATH,
  localSuffolk2027Pdf,
  wslSuffolk2027Pdf,
].find( ( candidate ): candidate is string => !!candidate && existsSync( candidate ) )

export function requireLayout15PdfPath(): string {
  if ( !layout15PdfPath ) {
    throw new Error(
      "Set LAYOUT15_PDF_PATH to the Suffolk Swimming Qualifying Times 2027 PDF before running this test."
    )
  }
  return layout15PdfPath
}
