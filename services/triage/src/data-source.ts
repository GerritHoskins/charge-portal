import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { typeOrmOptions } from './database/typeorm.options'

const databaseUrl = process.env.TRIAGE_DATABASE_URL
if (!databaseUrl) throw new Error('TRIAGE_DATABASE_URL is required')

/** Used by the TypeORM CLI: `npm run migration:run` (builds first, then `typeorm migration:run -d dist/data-source.js`). */
export default new DataSource(typeOrmOptions(databaseUrl))
