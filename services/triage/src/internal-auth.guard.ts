import { createHash, timingSafeEqual } from 'node:crypto'
import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { APP_CONFIG, type AppConfig } from './config'

/** GraphQL context shape shared by all resolvers: `actor` is set by InternalAuthGuard. */
export interface TriageContext {
  req: { headers: Record<string, string | string[] | undefined> }
  /** Operator asserted by the BFF in `x-actor`, or null when absent. Never end-user authentication (ADR 0009). */
  actor?: string | null
}

const digest = (value: string) => createHash('sha256').update(value).digest()

/**
 * Global guard (registered via APP_GUARD): only the BFF may call the service. Requests without the
 * shared `x-internal-token` are rejected before any resolver runs. The BFF-asserted `x-actor` is copied
 * into the GraphQL context so resolvers and audit entries can read it with the `@Actor()` decorator.
 * Deny by default: anything that is not a GraphQL request is refused too.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: Pick<AppConfig, 'internalToken'>) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType<string>() !== 'graphql') throw new UnauthorizedException()
    const gqlContext = GqlExecutionContext.create(context).getContext<TriageContext>()
    const headers = gqlContext.req?.headers ?? {}

    const token = headers['x-internal-token']
    if (typeof token !== 'string' || !this.tokenMatches(token)) throw new UnauthorizedException()

    const actor = headers['x-actor']
    gqlContext.actor = typeof actor === 'string' && actor.trim() !== '' ? actor.trim() : null
    return true
  }

  /** Constant-time comparison; hashing first makes the buffers equal length for any input. */
  private tokenMatches(supplied: string): boolean {
    return timingSafeEqual(digest(supplied), digest(this.config.internalToken))
  }
}
