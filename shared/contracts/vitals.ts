import { z } from 'zod'

export const vitalNameSchema = z.enum(['LCP', 'INP', 'CLS', 'TTFB', 'FCP'])
export const vitalRatingSchema = z.enum(['good', 'needs-improvement', 'poor'])

export const vitalsBeaconSchema = z.object({
  route: z.string().max(200).refine(
    (route) => /^\/shop(?:[/?#]|$)/.test(route),
    { message: 'Route must be a shop path' },
  ),
  name: vitalNameSchema,
  value: z.number().nonnegative(),
  rating: vitalRatingSchema,
  id: z.string().max(64),
  navigationType: z.string().optional(),
  attribution: z.object({
    target: z.string().max(200).optional(),
  }).optional(),
}).refine(
  ({ name, value }) => value <= (name === 'CLS' ? 10 : 120_000),
  { path: ['value'], message: 'Value exceeds the allowed range for this metric' },
)

export type VitalName = z.infer<typeof vitalNameSchema>
export type VitalRating = z.infer<typeof vitalRatingSchema>
export type VitalsBeacon = z.infer<typeof vitalsBeaconSchema>

export const normalizeRoute = (route: string): string => {
  const path = route.split(/[?#]/, 1)[0] ?? route

  if (path === '/shop' || path === '/shop/') return '/shop'
  if (/^\/shop\/cart\/?$/.test(path)) return '/shop/cart'
  if (/^\/shop\/c\/[^/]+\/?$/.test(path)) return '/shop/c/:category'
  if (/^\/shop\/[^/]+\/?$/.test(path)) return '/shop/:slug'
  return path
}
