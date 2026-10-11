export const TENANTS = ['default', 'stadtwerke-demo', 'fleet-demo'] as const
export type Tenant = (typeof TENANTS)[number]

export const isTenant = (value: unknown): value is Tenant =>
  typeof value === 'string' && (TENANTS as readonly string[]).includes(value)

// White-label: the tenant comes from `?tenant=` (demo only; a real deployment
// would derive it from the host name) and selects a token override layer.
export const useTenant = () => {
  const route = useRoute()
  const tenant = useState<Tenant>('tenant', () => 'default')
  const requested = route.query.tenant
  if (isTenant(requested)) tenant.value = requested
  return { tenant }
}
