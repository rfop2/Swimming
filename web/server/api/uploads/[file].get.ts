import { defineEventHandler, getRouterParam, createError, sendStream, setHeader, setResponseStatus } from "h3"
import { createReadStream, promises as fsp } from "node:fs"
import { basename, extname, join } from "node:path"

const contentTypeFor = (ext: string) => {
  if (ext === ".mp4") return "video/mp4"
  if (ext === ".webm") return "video/webm"
  if (ext === ".mov") return "video/quicktime"
  return "application/octet-stream"
}

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, "file") || ""
  const file = basename(raw)
  if (!file || file !== raw) throw createError({ statusCode: 400, statusMessage: "Invalid file" })

  const filePath = join(process.cwd(), "public", "uploads", file)

  let stat
  try {
    stat = await fsp.stat(filePath)
  } catch {
    throw createError({ statusCode: 404, statusMessage: "Not found" })
  }

  if (!stat.isFile()) throw createError({ statusCode: 404, statusMessage: "Not found" })

  const size = stat.size
  const ext = extname(file).toLowerCase()

  setHeader(event, "Content-Type", contentTypeFor(ext))
  setHeader(event, "Accept-Ranges", "bytes")

  const range = event.node.req.headers.range
  if (range) {
    const m = /^bytes=(\d+)-(\d*)$/.exec(range)
    if (!m) throw createError({ statusCode: 416, statusMessage: "Invalid range" })

    const start = Number(m[1])
    const end = m[2] ? Number(m[2]) : size - 1

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= size) {
      setHeader(event, "Content-Range", `bytes */${size}`)
      throw createError({ statusCode: 416, statusMessage: "Range not satisfiable" })
    }

    setResponseStatus(event, 206)
    setHeader(event, "Content-Range", `bytes ${start}-${end}/${size}`)
    setHeader(event, "Content-Length", String(end - start + 1))

    return sendStream(event, createReadStream(filePath, { start, end }))
  }

  setHeader(event, "Content-Length", String(size))
  return sendStream(event, createReadStream(filePath))
})
