import type { DataSourceOptions } from 'typeorm'
import { migrations } from '../migrations'

/** Options shared by the Nest app (app.module.ts) and the TypeORM CLI (data-source.ts). */
export function typeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    // ADR 0009: schema changes happen through migrations only.
    synchronize: false,
    migrations,
  }
}
