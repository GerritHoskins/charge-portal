import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import type { TriageContext } from './internal-auth.guard'

/** Resolver parameter: the operator the BFF asserted in `x-actor`, or null. Mutations must require it. */
export const Actor = createParamDecorator((_data: unknown, context: ExecutionContext): string | null => {
  return GqlExecutionContext.create(context).getContext<TriageContext>().actor ?? null
})
