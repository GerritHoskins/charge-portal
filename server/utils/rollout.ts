import { createHash } from 'node:crypto'

// Per-route rollout and rollback between Nuxt and legacy (ADR 0005).
// Config string (NUXT_ROLLOUT): "<prefix>=<percent>,..." where percent is the share of users
// served by NUXT. 0 is the kill switch (everybody back on legacy), 100 or unlisted is fully migrated.
// Free of Nitro auto-imports so it can be unit tested.
export interface RolloutRule {
  prefix: string
  percent: number
}

export const parseRollout = (value: string): RolloutRule[] =>
  value
    .split(',')
    .map((entry) => entry.trim().match(/^(\/portal(?:\/[A-Za-z0-9_-]+)*)=(\d{1,3})$/))
    .flatMap((m) => (m && Number(m[2]) <= 100 ? [{ prefix: m[1]!, percent: Number(m[2]) }] : []))

// Stable 0-99 bucket per key, so a user keeps seeing the same variant between requests.
export const bucketOf = (key: string): number => createHash('sha256').update(key).digest().readUInt32BE(0) % 100

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

const ruleFor = (path: string, rules: RolloutRule[]) =>
  rules.filter((r) => matches(path, r.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0]

export const routedToLegacy = (path: string, rules: RolloutRule[], key: string): boolean => {
  const rule = ruleFor(path, rules)
  return rule ? bucketOf(key) >= rule.percent : false
}

export const legacyPrefixesFor = (rules: RolloutRule[], key: string): string[] =>
  rules.filter((r) => routedToLegacy(r.prefix, rules, key)).map((r) => r.prefix)
