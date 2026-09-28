import type { ImportEvent } from "../../types"
import { parseSwimmingXlsx } from "./default"
import { parseSwimmingXlsxLayout19 } from "./layout19"
import { parseSwimmingXlsxLayout26 } from "./layout26"
import { parseSwimmingXlsxLayout27 } from "./layout27"
import { parseSwimmingXlsxLayout30 } from "./layout30"

type XlsxParser = ( buffer: ArrayBuffer | Buffer ) => ImportEvent[]

export const xlsxParserRegistry: Record<string, XlsxParser> = {
  xlsx: parseSwimmingXlsx,
  layout19: parseSwimmingXlsxLayout19,
  layout26: parseSwimmingXlsxLayout26,
  layout27: parseSwimmingXlsxLayout27,
  layout30: parseSwimmingXlsxLayout30,
}

export const getXlsxParser = ( layout: string ) => xlsxParserRegistry[layout]
