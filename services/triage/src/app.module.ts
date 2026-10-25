import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ApolloDriverConfig } from '@nestjs/apollo'
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { GraphQLModule } from '@nestjs/graphql'
import { TypeOrmModule } from '@nestjs/typeorm'
import { APP_CONFIG, type AppConfig, ConfigModule } from './config'
import { AuditModule } from './audit/audit.module'
import { typeOrmOptions } from './database/typeorm.options'
import { DraftingModule } from './drafting/drafting.module'
import { FaultsModule } from './faults/faults.module'
import { Express5ApolloDriver } from './graphql/express5-apollo.driver'
import { HealthModule } from './health/health.module'
import { InternalAuthGuard, type TriageContext } from './internal-auth.guard'
import { TicketsModule } from './tickets/tickets.module'

/** services/triage/schema.gql, found from this file whether it runs from src/ or from the bundled dist/. */
function schemaFile(): string {
  let dir = dirname(fileURLToPath(import.meta.url))
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir)
    if (parent === dir) throw new Error('Cannot locate the triage package root')
    dir = parent
  }
  return join(dir, 'schema.gql')
}

@Module({
  imports: [
    ConfigModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: Express5ApolloDriver,
      // Generated from the TypeScript classes and committed so schema changes are reviewable (ADR 0009).
      // In production the schema stays in memory: the deployed bundle must not write files.
      autoSchemaFile: process.env.NODE_ENV === 'production' ? true : schemaFile(),
      sortSchema: true,
      // Only the BFF calls this service; never hand stack traces back, even outside production.
      includeStacktraceInErrorResponses: false,
      context: ({ req }: Pick<TriageContext, 'req'>): TriageContext => ({ req }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        ...typeOrmOptions(config.databaseUrl),
        migrationsRun: true,
        // Feature modules register their entities with TypeOrmModule.forFeature([...]).
        autoLoadEntities: true,
      }),
    }),
    HealthModule,
    AuditModule,
    DraftingModule,
    TicketsModule,
    FaultsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: InternalAuthGuard }],
})
export class AppModule {}
