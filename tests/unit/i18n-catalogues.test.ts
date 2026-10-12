import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

type Tree = { [key: string]: string | Tree }
const load = (locale: string): Tree => JSON.parse(readFileSync(`i18n/locales/${locale}.json`, 'utf8'))

const flatten = (tree: Tree, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([k, v]) => (typeof v === 'string' ? [prefix + k] : flatten(v, `${prefix}${k}.`)))

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))

const de = flatten(load('de')).sort()
const en = flatten(load('en')).sort()

describe('i18n catalogues', () => {
  it('de and en define exactly the same keys', () => {
    expect(en).toEqual(de)
  })

  it('no message is empty', () => {
    const empty = (tree: Tree): string[] => flatten(tree).filter((k) => !k.split('.').reduce<string | Tree>((n, p) => (n as Tree)[p]!, tree))
    expect([...empty(load('de')), ...empty(load('en'))]).toEqual([])
  })

  it('placeholders match between languages', () => {
    const value = (locale: string, key: string) => key.split('.').reduce<string | Tree>((n, p) => (n as Tree)[p]!, load(locale)) as string
    const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const key of de) expect(holes(value('en', key)), key).toEqual(holes(value('de', key)))
  })

  it('every statically referenced key exists', () => {
    const files = walk('app').filter((f) => f.endsWith('.vue') || f.endsWith('.ts'))
    const used = files.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/\bt\('([a-zA-Z0-9_.-]+)'/g)].map((m) => m[1]!))
    expect(used.length).toBeGreaterThan(20)
    expect(used.filter((key) => !de.includes(key))).toEqual([])
  })
})
