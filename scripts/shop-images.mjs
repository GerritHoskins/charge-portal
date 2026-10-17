// Generate placeholder product images for the stand-in catalogue
// (legacy/catalog.mjs) into public/shop/: one placeholder per product and
// width (400/800/1600 px). The base placeholders are simple, commit-ready SVG
// files (product name and a coloured shape, deterministic by name). WP-20
// needs raster images to demonstrate image optimization, so when `sharp` is
// available the script also writes JPEG variants of the same art; the
// catalogue data references the 1600 px variant.

import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { products, slugify } from '../legacy/catalog.mjs'

const WIDTHS = [400, 800, 1600]
const COLORS = ['#0e7490', '#15803d', '#b45309', '#7c3aed', '#be123c', '#1d4ed8']
const SHAPES = ['circle', 'square', 'diamond', 'rings']

const pick = (text, list, salt) =>
  list[
    [...text].reduce((hash, char) => (hash * 31 + char.codePointAt(0) + salt) | 0, 17) % list.length
  ]

const esc = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function svgFor(product, width) {
  const { name } = product
  const color = pick(name, COLORS, 3)
  const cx = width / 2
  const cy = width * 0.44
  const side = width * 0.36
  const shapes = {
    circle: `<circle cx="${cx}" cy="${cy}" r="${width * 0.17}" fill="${color}" />`,
    square: `<rect x="${cx - side / 2}" y="${cy - side / 2}" width="${side}" height="${side}" rx="${width * 0.03}" fill="${color}" />`,
    diamond: `<rect x="${cx - side / 2.6}" y="${cy - side / 2.6}" width="${side / 1.3}" height="${side / 1.3}" transform="rotate(45 ${cx} ${cy})" fill="${color}" />`,
    rings: `<circle cx="${cx}" cy="${cy}" r="${width * 0.2}" fill="none" stroke="${color}" stroke-width="${width * 0.035}" /><circle cx="${cx}" cy="${cy}" r="${width * 0.1}" fill="${color}" />`,
  }
  const short = name.length > 26 ? `${name.slice(0, 25)}…` : name
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}" viewBox="0 0 ${width} ${width}" role="img" aria-label="${esc(name)} (placeholder image)">`,
    `<rect width="${width}" height="${width}" fill="#f8fafc" />`,
    shapes[pick(name, SHAPES, 11)],
    `<text x="${cx}" y="${width * 0.88}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(width * 0.05)}" fill="#334155">${esc(short)}</text>`,
    '</svg>',
    '',
  ].join('\n')
}

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'shop')
await mkdir(outDir, { recursive: true })

let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  sharp = null
}

for (const product of products) {
  const slug = slugify(product.name)
  for (const width of WIDTHS) {
    const base = path.join(outDir, `${slug}-${width}`)
    const svg = svgFor(product, width)
    await writeFile(`${base}.svg`, svg)
    if (sharp) {
      await sharp(Buffer.from(svg)).resize(width, width).jpeg({ quality: 82 }).toFile(`${base}.jpg`)
    }
  }
}

let totalBytes = 0
let totalFiles = 0
for (const file of await readdir(outDir)) {
  totalFiles += 1
  totalBytes += (await stat(path.join(outDir, file))).size
}

console.log(`Raster: ${sharp ? 'JPEG via sharp' : 'unavailable — SVG only (note in progress log Open questions)'}`)
console.log(`Wrote ${totalFiles} files for ${products.length} products into ${path.relative(process.cwd(), outDir)}`)
console.log(`public/shop total: ${(totalBytes / 1024).toFixed(1)} KB`)
