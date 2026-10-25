import type { ExecutionContext } from '@nestjs/common'

export type Headers = Record<string, string | string[] | undefined>

/** A GraphQL ExecutionContext as Nest builds it for a resolver: args are [root, args, context, info]. */
export function gqlExecutionContext(headers: Headers) {
  const gqlContext: Record<string, unknown> = { req: { headers } }
  const args = [{}, {}, gqlContext, {}]
  const context = {
    getType: () => 'graphql',
    getArgs: () => args,
    getArgByIndex: (index: number) => args[index],
    getClass: () => Object,
    getHandler: () => () => undefined,
  } as unknown as ExecutionContext
  return { context, gqlContext }
}
