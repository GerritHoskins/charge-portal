import type { DataSource } from 'typeorm'
import { describe, expect, it, vi } from 'vitest'
import { HealthResolver } from '../../src/health/health.resolver'
import { HealthService } from '../../src/health/health.service'

function serviceWith(query: () => Promise<unknown>) {
  return new HealthService({ query } as unknown as DataSource)
}

describe('HealthService', () => {
  it('reports ok when the database answers', async () => {
    const query = vi.fn().mockResolvedValue([{ '?column?': 1 }])
    await expect(serviceWith(query).check()).resolves.toEqual({ status: 'ok', database: true })
    expect(query).toHaveBeenCalledWith('SELECT 1')
  })

  it('reports degraded (not an error) when the database is unreachable', async () => {
    const service = serviceWith(() => Promise.reject(new Error('connect ECONNREFUSED')))
    await expect(service.check()).resolves.toEqual({ status: 'degraded', database: false })
  })
})

describe('HealthResolver', () => {
  it('delegates the health query to the service', async () => {
    const check = vi.fn().mockResolvedValue({ status: 'ok', database: true })
    const resolver = new HealthResolver({ check } as unknown as HealthService)
    await expect(resolver.health()).resolves.toEqual({ status: 'ok', database: true })
  })
})
