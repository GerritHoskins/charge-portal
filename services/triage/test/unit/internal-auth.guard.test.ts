import { UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { InternalAuthGuard } from '../../src/internal-auth.guard'
import { gqlExecutionContext } from '../helpers/gql-context'

const TOKEN = 'synthetic-internal-token'
const guard = new InternalAuthGuard({ internalToken: TOKEN })

describe('InternalAuthGuard', () => {
  it('rejects a request without the internal token', () => {
    const { context } = gqlExecutionContext({})
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException)
  })

  it('denies by default anything that is not a GraphQL request', () => {
    const { context } = gqlExecutionContext({ 'x-internal-token': TOKEN })
    vi.spyOn(context, 'getType').mockReturnValue('http')
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException)
  })

  it('rejects a wrong token', () => {
    const { context } = gqlExecutionContext({ 'x-internal-token': 'nope' })
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException)
  })

  it('rejects a token that differs only in length without throwing a RangeError', () => {
    const { context } = gqlExecutionContext({ 'x-internal-token': `${TOKEN}-extra` })
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException)
  })

  it('rejects repeated token headers', () => {
    const { context } = gqlExecutionContext({ 'x-internal-token': [TOKEN, TOKEN] })
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException)
  })

  it('does not set an actor on a rejected request', () => {
    const { context, gqlContext } = gqlExecutionContext({ 'x-actor': 'ops@example.test' })
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException)
    expect(gqlContext.actor).toBeUndefined()
  })

  it('accepts the right token and reads x-actor into the GraphQL context', () => {
    const { context, gqlContext } = gqlExecutionContext({ 'x-internal-token': TOKEN, 'x-actor': ' ops@example.test ' })
    expect(guard.canActivate(context)).toBe(true)
    expect(gqlContext.actor).toBe('ops@example.test')
  })

  it('sets the actor to null when x-actor is missing or blank', () => {
    const missing = gqlExecutionContext({ 'x-internal-token': TOKEN })
    expect(guard.canActivate(missing.context)).toBe(true)
    expect(missing.gqlContext.actor).toBeNull()

    const blank = gqlExecutionContext({ 'x-internal-token': TOKEN, 'x-actor': '   ' })
    expect(guard.canActivate(blank.context)).toBe(true)
    expect(blank.gqlContext.actor).toBeNull()
  })
})
