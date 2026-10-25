import { GraphQLError } from 'graphql'
import type { z } from 'zod'
import type { TicketState } from './ticket.entity'

/**
 * Error codes of the decision mutations (`extensions.code`). The BFF maps them to HTTP statuses:
 * FORBIDDEN 403, TICKET_NOT_FOUND 404, TICKET_ALREADY_DECIDED 409, BAD_USER_INPUT 422.
 */
export const DECISION_ERROR_CODES = ['FORBIDDEN', 'TICKET_NOT_FOUND', 'TICKET_ALREADY_DECIDED', 'BAD_USER_INPUT'] as const

export const forbidden = () =>
  new GraphQLError('A decision needs an operator: x-actor is missing', { extensions: { code: 'FORBIDDEN' } })

export const ticketNotFound = () => new GraphQLError('Ticket not found', { extensions: { code: 'TICKET_NOT_FOUND' } })

export const ticketAlreadyDecided = (state?: TicketState) =>
  new GraphQLError('The ticket has already been decided; approved, edited and rejected tickets never change', {
    extensions: { code: 'TICKET_ALREADY_DECIDED', ...(state ? { state } : {}) },
  })

export const invalidInput = (message: string, issues: { path: (string | number)[]; message: string; code: string }[]) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', issues } })

/** Paths, messages and zod codes only: zod does not echo the submitted values. */
export function invalidInputFromZod(message: string, error: z.ZodError, pathPrefix: string[] = []) {
  return invalidInput(
    message,
    error.issues.map((issue) => ({
      path: [...pathPrefix, ...issue.path.map((part) => (typeof part === 'symbol' ? part.toString() : part))],
      message: issue.message,
      code: issue.code,
    })),
  )
}
