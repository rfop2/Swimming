import type { ImportEvent } from "../types"
import { parseSwimmingPdf } from "./pdf/layout1"
import { parseSwimmingPdfLayout2 } from "./pdf/layout2"
import { parseSwimmingPdfLayout3 } from "./pdf/layout3"
import { parseSwimmingPdfLayout4 } from "./pdf/layout4"
import { parseSwimmingPdfLayout5 } from "./pdf/layout5"
import { parseSwimmingPdfLayout6 } from "./pdf/layout6"
import { parseSwimmingPdfLayout7 } from "./pdf/layout7"
import { parseSwimmingPdfLayout8 } from "./pdf/layout8"
import { parseSwimmingPdfLayout9 } from "./pdf/layout9"
import { parseSwimmingPdfLayout10 } from "./pdf/layout10"
import { parseSwimmingPdfLayout11 } from "./pdf/layout11"
import { parseSwimmingPdfLayout12 } from "./pdf/layout12"
import { parseSwimmingPdfLayout13 } from "./pdf/layout13"
import { parseSwimmingPdfLayout14 } from "./pdf/layout14"
import { parseSwimmingPdfLayout15 } from "./pdf/layout15"
import { parseSwimmingPdfLayout16 } from "./pdf/layout16"
import { parseSwimmingPdfLayout17 } from "./pdf/layout17"
import { parseSwimmingPdfLayout18 } from "./pdf/layout18"
import { parseSwimmingPdfLayout20 } from "./pdf/layout20"
import { parseSwimmingPdfLayout21 } from "./pdf/layout21"
import { parseSwimmingPdfLayout22 } from "./pdf/layout22"
import { parseSwimmingPdfLayout23 } from "./pdf/layout23"

export type PdfParser = ( text: string ) => ImportEvent[]

export const pdfParserRegistry = {
  layout1: parseSwimmingPdf,
  layout2: parseSwimmingPdfLayout2,
  layout3: parseSwimmingPdfLayout3,
  layout4: parseSwimmingPdfLayout4,
  layout5: parseSwimmingPdfLayout5,
  layout6: parseSwimmingPdfLayout6,
  layout7: parseSwimmingPdfLayout7,
  layout8: parseSwimmingPdfLayout8,
  layout9: parseSwimmingPdfLayout9,
  layout10: parseSwimmingPdfLayout10,
  layout11: parseSwimmingPdfLayout11,
  layout12: parseSwimmingPdfLayout12,
  layout13: parseSwimmingPdfLayout13,
  layout14: parseSwimmingPdfLayout14,
  layout15: parseSwimmingPdfLayout15,
  layout16: parseSwimmingPdfLayout16,
  layout17: parseSwimmingPdfLayout17,
  layout18: parseSwimmingPdfLayout18,
  layout20: parseSwimmingPdfLayout20,
  layout21: parseSwimmingPdfLayout21,
  layout22: parseSwimmingPdfLayout22,
  layout23: parseSwimmingPdfLayout23,
} satisfies Record<string, PdfParser>

export type PdfLayout = keyof typeof pdfParserRegistry

export function getPdfParser( layout: string ): PdfParser | undefined {
  return pdfParserRegistry[layout as PdfLayout]
}
