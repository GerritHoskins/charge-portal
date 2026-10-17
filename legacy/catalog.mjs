// Synthetic catalogue data for the legacy stand-in (WP-03). Deterministic:
// every id, slug and price is derived from the product index, so the data is
// stable between runs. Names are invented and generic — no brand names.
//
// Products carry the raw Store-API shape from shared/contracts/catalog.ts
// (storeApiProductSchema) plus `categoryId`, which the contract strips at
// parse time and which links a product to one of `categories`.

const UMLAUTS = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }

export function slugify(name) {
  return name
    .split('')
    .map((char) => UMLAUTS[char] ?? char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// 32-char lowercase Shopware-style id derived from a seed string, so the same
// seed always yields the same id (no Math.random).
function uuid(seed) {
  const mask = (1n << 64n) - 1n
  let h1 = 0xcbf29ce484222325n
  let h2 = 0x9e3779b97f4a7c15n
  for (const char of seed) {
    const c = BigInt(char.codePointAt(0))
    h1 = ((h1 ^ c) * 1099511628211n) & mask
    h2 = (h2 * 31n + c) & mask
  }
  return `${h1.toString(16).padStart(16, '0')}${h2.toString(16).padStart(16, '0')}`
}

const round2 = (value) => Math.round(value * 100) / 100

const WALLBOX_MODELS = ['Home', 'Pro', 'Plus', 'Compact', 'Garage', 'Smart']
const WALLBOX_KW = [7.4, 11, 22]

const wallboxEntries = []
for (const kw of WALLBOX_KW) {
  for (const model of WALLBOX_MODELS) {
    wallboxEntries.push({ name: `Wallbox ${model} ${kw}`, powerKw: kw })
  }
}
wallboxEntries.push({ name: 'Wallbox Home 11 Duo', powerKw: 11 })
wallboxEntries.push({ name: 'Wallbox Pro 22 Duo', powerKw: 22 })
wallboxEntries.push({
  name: 'Wallbox Fleet CCS 50',
  powerKw: 50,
  connectorType: 'CCS',
  price: 899,
  imageUrl: '/shop/wallbox-home-11-1600.jpg',
})
wallboxEntries.push({
  name: 'Wallbox Depot CCS 75',
  powerKw: 75,
  connectorType: 'CCS',
  price: 1099,
  imageUrl: '/shop/wallbox-pro-22-1600.jpg',
})
wallboxEntries.push({
  name: 'Wallbox Solar 11',
  powerKw: 11,
  price: 749,
  imageUrl: '/shop/wallbox-plus-11-1600.jpg',
})
wallboxEntries.push({
  name: 'Wallbox Urban 22',
  powerKw: 22,
  price: 999,
  imageUrl: '/shop/wallbox-compact-22-1600.jpg',
})

const ACCESSORY_ENTRIES = [
  'Ladekabel Typ 1, 5 m',
  'Ladekabel Typ 1, 10 m',
  'Ladekabel Typ 1, 20 m',
  'Ladekabel Typ 2, 5 m',
  'Ladekabel Typ 2, 7,5 m',
  'Ladekabel Typ 2, 10 m',
  'Ladekabel Typ 2, 15 m',
  'Ladekabel Typ 2, 20 m',
  'Ladekabel Typ 2, 5 m, 22 kW',
  'Ladekabel Typ 2, 15 m, 22 kW',
  'Ladekabel Typ 2, 20 m, 22 kW',
  'Steckeradapter CEE 16 A',
  'Steckeradapter Schuko 16 A',
  'Steckeradapter Typ 1 auf Typ 2',
  'Kabelhaken Typ 2',
  'Kabelring, 5 Stück',
  'Ladecover Typ 2',
  'Wandleiste 4-fach',
  'Adapter 110 V - 230 V',
  'Verlängerungskabel 230 V, 5 m',
  {
    name: 'CCS-Schutzkappe',
    kind: 'cover',
    connectorType: 'CCS',
    price: 34.9,
    imageUrl: '/shop/ladecover-typ-2-1600.jpg',
  },
  {
    name: 'CCS-Kabelhalter',
    kind: 'holder',
    connectorType: 'CCS',
    price: 49.9,
    imageUrl: '/shop/kabelhaken-typ-2-1600.jpg',
  },
  {
    name: 'Transporttasche Ladekabel',
    kind: 'case',
    connectorType: 'Typ 2',
    price: 59.9,
    imageUrl: '/shop/ladekabel-typ-2-5-m-1600.jpg',
  },
  {
    name: 'Wandhalterung Ladekabel',
    kind: 'holder',
    connectorType: 'Typ 1/Typ 2',
    price: 44.9,
    imageUrl: '/shop/steckeradapter-typ-1-auf-typ-2-1600.jpg',
  },
]

const ACCESSORY_SPECIALS = ['holder', 'ring', 'cover', 'splitter', 'inverter', 'cable']

function accessoryFields(entry, index) {
  if (typeof entry !== 'string') return { kind: entry.kind, connectorType: entry.connectorType }
  const name = entry
  if (index < 11) return { kind: 'cable', connectorType: name.includes('Typ 1') ? 'Typ 1' : 'Typ 2' }
  if (index < 14) return { kind: 'adapter', connectorType: ['CEE', 'Schuko', 'Typ 1/Typ 2'][index - 11] }
  return { kind: ACCESSORY_SPECIALS[index - 14] }
}

function makeProducts(category, prefix, entries, priceAt, fieldsAt) {
  return entries.map((entry, index) => {
    const name = typeof entry === 'string' ? entry : entry.name
    const slug = slugify(name)
    const available = index % 9 !== 0
    const price = typeof entry === 'string' ? undefined : entry.price
    const imageUrl = typeof entry === 'string' ? undefined : entry.imageUrl
    return {
      categoryId: category.id,
      slug,
      id: uuid(`product:${slug}`),
      productNumber: `${prefix}-${1001 + index}`,
      name,
      available,
      availableStock: available ? 4 + ((index * 7) % 40) : 0,
      calculatedPrice: { unitPrice: price ?? priceAt(index) },
      cover: { media: { url: imageUrl ?? `/shop/${slug}-1600.jpg` } },
      seoUrls: [{ seoPathInfo: slug }],
      customFields: fieldsAt(entry, index),
    }
  })
}

export const categories = [
  { id: uuid('category:wallbox'), name: 'Wallboxes', slug: 'wallboxes' },
  { id: uuid('category:accessory'), name: 'Accessories', slug: 'accessories' },
]

export const wallboxes = makeProducts(
  categories[0],
  'WB',
  wallboxEntries,
  (index) => round2(399 + index * 46.75),
  (entry) => ({ powerKw: entry.powerKw, connectorType: entry.connectorType ?? 'Typ 2' }),
)

export const accessories = makeProducts(
  categories[1],
  'AC',
  ACCESSORY_ENTRIES,
  (index) => round2(24.9 + index * 8.35),
  (entry, index) => accessoryFields(entry, index),
)

export const products = [...wallboxes, ...accessories]

const publicProduct = ({ categoryId: _categoryId, slug: _slug, ...product }) => product

const boundedInteger = (value, fallback, maximum = Number.POSITIVE_INFINITY) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(maximum, Math.max(1, Math.floor(number))) : fallback
}

export function findProduct(productId) {
  const product = products.find(({ id }) => id === productId)
  return product ? publicProduct(product) : undefined
}

export function queryListing(categoryId, params = {}) {
  if (!categories.some(({ id }) => id === categoryId)) return undefined

  const page = boundedInteger(params.page, 1)
  const limit = boundedInteger(params.limit, 24, 48)
  const minPower = Number(params['min-power'])
  const connector = typeof params.connector === 'string' && params.connector ? params.connector : undefined
  const order = ['price-asc', 'price-desc', 'name-asc'].includes(params.order) ? params.order : 'name-asc'

  const matches = products
    .filter((product) => product.categoryId === categoryId)
    .filter((product) => !Number.isFinite(minPower) || Number(product.customFields.powerKw) >= minPower)
    .filter((product) => !connector || product.customFields.connectorType === connector)
    .sort((left, right) => {
      if (order === 'price-asc') return left.calculatedPrice.unitPrice - right.calculatedPrice.unitPrice
      if (order === 'price-desc') return right.calculatedPrice.unitPrice - left.calculatedPrice.unitPrice
      return left.name.localeCompare(right.name, 'de')
    })

  const offset = (page - 1) * limit
  return {
    elements: matches.slice(offset, offset + limit).map(publicProduct),
    total: matches.length,
    page,
    limit,
    availableSortings: [
      { key: 'name-asc', label: 'Name' },
      { key: 'price-asc', label: 'Price ascending' },
      { key: 'price-desc', label: 'Price descending' },
    ],
    currentFilters: { order, ...(Number.isFinite(minPower) ? { 'min-power': minPower } : {}), ...(connector ? { connector } : {}) },
    aggregations: {
      power: [...new Set(matches.map((product) => product.customFields.powerKw).filter((value) => typeof value === 'number'))].sort((a, b) => a - b),
      connector: [...new Set(matches.map((product) => product.customFields.connectorType).filter((value) => typeof value === 'string'))].sort(),
    },
  }
}
