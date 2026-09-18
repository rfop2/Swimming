import type { ImportEvent } from "../../types"
import { parseSwimmingXlsx } from "./default"
import { parseSwimmingXlsxLayout19 } from "./layout19"
import { parseSwimmingXlsxLayout24 } from "./layout24"

type XlsxParser = ( buffer: ArrayBuffer | Buffer ) => ImportEvent[]

export const xlsxParserRegistry: Record<string, XlsxParser> = {
  xlsx: parseSwimmingXlsx,
  layout19: parseSwimmingXlsxLayout19,
  layout24: parseSwimmingXlsxLayout24,
}

export const getXlsxParser = ( layout: string ) => xlsxParserRegistry[layout]
