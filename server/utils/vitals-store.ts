import { normalizeRoute, type VitalName, type VitalsBeacon } from '../../shared/contracts/vitals'

export interface VitalsStoreOptions {
  capacity?: number
}

export interface VitalSummary {
  p75: number
  count: number
  good: number
  needsImprovement: number
  poor: number
}

export type VitalsSummary = Record<string, Partial<Record<VitalName, VitalSummary>>>

export const percentile = (values: number[], p: number): number | null => {
  if (values.length === 0) return null
  if (!Number.isFinite(p) || p <= 0 || p > 1) {
    throw new RangeError('Percentile must be greater than 0 and at most 1')
  }

  const sorted = [...values].sort((left, right) => left - right)
  // Nearest-rank: rank = ceil(p * sample size), using a one-based rank.
  const index = Math.ceil(p * sorted.length) - 1
  return sorted[index] ?? null
}

export const createVitalsStore = ({ capacity = 5_000 }: VitalsStoreOptions = {}) => {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new RangeError('Capacity must be a positive integer')
  }

  const entries = new Array<VitalsBeacon | undefined>(capacity)
  let start = 0
  let size = 0

  return {
    add(beacon: VitalsBeacon): void {
      if (size < capacity) {
        entries[(start + size) % capacity] = beacon
        size += 1
        return
      }

      entries[start] = beacon
      start = (start + 1) % capacity
    },

    summary(): VitalsSummary {
      const grouped = new Map<string, Map<VitalName, VitalsBeacon[]>>()

      for (let offset = 0; offset < size; offset += 1) {
        const beacon = entries[(start + offset) % capacity]
        if (!beacon) continue

        const route = normalizeRoute(beacon.route)
        const byMetric = grouped.get(route) ?? new Map<VitalName, VitalsBeacon[]>()
        const samples = byMetric.get(beacon.name) ?? []
        samples.push(beacon)
        byMetric.set(beacon.name, samples)
        grouped.set(route, byMetric)
      }

      const result: VitalsSummary = {}
      for (const [route, byMetric] of grouped) {
        const routeSummary: Partial<Record<VitalName, VitalSummary>> = {}

        for (const [name, samples] of byMetric) {
          const values = samples.map(({ value }) => value)
          const p75 = percentile(values, 0.75)
          if (p75 === null) continue

          routeSummary[name] = {
            p75,
            count: samples.length,
            good: samples.filter(({ rating }) => rating === 'good').length,
            needsImprovement: samples.filter(({ rating }) => rating === 'needs-improvement').length,
            poor: samples.filter(({ rating }) => rating === 'poor').length,
          }
        }

        result[route] = routeSummary
      }

      return result
    },
  }
}
