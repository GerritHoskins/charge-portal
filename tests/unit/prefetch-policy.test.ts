import { describe, expect, it } from 'vitest'

// @ts-expect-error The prefetch policy is an intentionally plain Node.js module.
import { NO_PREFETCH, applyPrefetchPolicy } from '../../scripts/lib/prefetch-policy.mjs'

// Shaped like the client manifest Nuxt passes to `build:manifest` (keys as observed in a build).
const manifest = () => ({
  '#entry': { file: 'entry.js', isEntry: true, prefetch: true, dynamicImports: ['layouts/default.vue'] },
  '../node_modules/nuxt/dist/app/components/error-404.vue': { file: 'e404.js', prefetch: true },
  '../node_modules/nuxt/dist/app/components/error-500.vue': { file: 'e500.js', prefetch: true },
  'layouts/default.vue': { file: 'default.js', prefetch: true },
  'layouts/shop.vue': { file: 'shop.js', prefetch: true },
  'pages/shop/[slug].vue': { file: 'slug.js', prefetch: true },
  'components/my-error-404.vue': { file: 'mine.js', prefetch: true },
})

describe('prefetch policy', () => {
  it('turns prefetch off for Nuxt error pages and the portal layout only', () => {
    const input = manifest()
    const changed = applyPrefetchPolicy(input)

    expect(changed).toEqual([
      '../node_modules/nuxt/dist/app/components/error-404.vue',
      '../node_modules/nuxt/dist/app/components/error-500.vue',
      'layouts/default.vue',
    ])
    for (const key of changed) expect(input[key].prefetch).toBe(false)
    expect(input['layouts/shop.vue'].prefetch).toBe(true)
    expect(input['pages/shop/[slug].vue'].prefetch).toBe(true)
    expect(input['components/my-error-404.vue'].prefetch).toBe(true)
  })

  it('leaves the entry and everything else it imports untouched', () => {
    const input = manifest()
    applyPrefetchPolicy(input)

    expect(input['#entry']).toEqual(manifest()['#entry'])
    expect(input['layouts/default.vue'].file).toBe('default.js')
  })

  it('matches keys with Windows path separators', () => {
    const input = {
      '..\\node_modules\\nuxt\\dist\\app\\components\\error-500.vue': { file: 'e500.js', prefetch: true },
      'layouts\\default.vue': { file: 'default.js', prefetch: true },
    }

    expect(applyPrefetchPolicy(input)).toHaveLength(2)
    expect(Object.values(input).every(({ prefetch }) => prefetch === false)).toBe(true)
  })

  it('returns nothing to change for a manifest without those chunks', () => {
    expect(applyPrefetchPolicy({ 'layouts/shop.vue': { file: 'shop.js', prefetch: true } })).toEqual([])
    expect(applyPrefetchPolicy({})).toEqual([])
  })

  it('names the excluded chunks in one frozen list', () => {
    expect(Object.isFrozen(NO_PREFETCH)).toBe(true)
    expect(NO_PREFETCH).toEqual([
      'nuxt/dist/app/components/error-404.vue',
      'nuxt/dist/app/components/error-500.vue',
      'layouts/default.vue',
    ])
  })
})
