import { type CustomScalar, Scalar } from '@nestjs/graphql'
import { valueFromASTUntyped, type ValueNode } from 'graphql'

/** Marker type for the `JSON` scalar: `@Args('sample', { type: () => JsonValue })`. */
export class JsonValue {}

/**
 * Untyped JSON scalar for untrusted payloads (`ingestTelemetry(sample: JSON!)`). It performs no validation:
 * resolvers parse the value with zod at the boundary. There must be exactly one scalar named `JSON` in the schema.
 *
 * A class-based scalar on purpose: Nest builds the GraphQLScalarType with its own copy of `graphql`. A
 * `new GraphQLScalarType()` created here would come from a different module instance (ESM vs CJS) and be rejected.
 */
@Scalar('JSON', () => JsonValue)
export class JsonScalar implements CustomScalar<unknown, unknown> {
  description = 'Arbitrary JSON value. Untrusted: parsed by the resolver, not by the schema.'

  serialize(value: unknown): unknown {
    return value
  }

  parseValue(value: unknown): unknown {
    return value
  }

  parseLiteral(ast: ValueNode, variables?: Record<string, unknown> | null): unknown {
    return valueFromASTUntyped(ast, variables)
  }
}
