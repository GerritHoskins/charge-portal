import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { Health, HealthStatus } from './health.model'

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  /** A dead database is reported as `degraded`, not as a GraphQL error: health must stay answerable. */
  async check(): Promise<Health> {
    try {
      await this.dataSource.query('SELECT 1')
      return { status: HealthStatus.ok, database: true }
    } catch {
      return { status: HealthStatus.degraded, database: false }
    }
  }
}
