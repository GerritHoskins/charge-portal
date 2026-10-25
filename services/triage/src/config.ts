import { Global, Module } from '@nestjs/common'
import { z } from 'zod'

/** Injection token for the validated environment (see ConfigModule). */
export const APP_CONFIG = Symbol('APP_CONFIG')

const envSchema = z.object({
  TRIAGE_PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  // Internal service behind the BFF (ADR 0009): loopback unless deployment says otherwise.
  TRIAGE_HOST: z.string().trim().min(1).default('127.0.0.1'),
  TRIAGE_DATABASE_URL: z.string().trim().min(1),
  TRIAGE_INTERNAL_TOKEN: z.string().trim().min(1),
})

export interface AppConfig {
  port: number
  host: string
  databaseUrl: string
  internalToken: string
}

/**
 * Validates the environment. Throws (so the service refuses to start) when a required variable is
 * missing or malformed. The message names the variables only; it never echoes values (the token is a secret).
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    throw new Error(`Invalid triage configuration: ${problems.join('; ')}`)
  }
  const { TRIAGE_PORT, TRIAGE_HOST, TRIAGE_DATABASE_URL, TRIAGE_INTERNAL_TOKEN } = parsed.data
  return { port: TRIAGE_PORT, host: TRIAGE_HOST, databaseUrl: TRIAGE_DATABASE_URL, internalToken: TRIAGE_INTERNAL_TOKEN }
}

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadConfig() }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
