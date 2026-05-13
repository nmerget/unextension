import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const input = join(__dirname, '../src/assets/unextension_logo.png')
const output = join(__dirname, '../public/favicon.ico')

// sharp can't write .ico natively, so we embed a 32x32 PNG inside a
// minimal single-image ICO container.
const png = await sharp(readFileSync(input)).resize(32, 32).png().toBuffer()

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: 1 = ICO
header.writeUInt16LE(1, 4) // image count

const entry = Buffer.alloc(16)
entry.writeUInt8(32, 0) // width
entry.writeUInt8(32, 1) // height
entry.writeUInt8(0, 2) // color count
entry.writeUInt8(0, 3) // reserved
entry.writeUInt16LE(1, 4) // color planes
entry.writeUInt16LE(32, 6) // bits per pixel
entry.writeUInt32LE(png.length, 8) // image data size
entry.writeUInt32LE(22, 12) // offset (6 + 16)

writeFileSync(output, Buffer.concat([header, entry, png]))
console.log(`favicon.ico written to public/`)
