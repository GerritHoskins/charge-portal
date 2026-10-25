import { type CustomScalar, Scalar } from '@nestjs/graphql'
import { Kind, type ValueNode } from 'graphql'

type Variables = Record<string, unknown> | null | undefined

function literalValue(node: ValueNode, variables: Variables): unknown {
  switch (node.kind) {
    case Kind.STRING:
    case Kind.ENUM:
      return node.value
    case Kind.BOOLEAN:
      return node.value
    case Kind.INT:
    case Kind.FLOAT:
      return Number(node.value)
    case Kind.NULL:
      return null
    case Kind.LIST:
      return node.values.map((value) => literalValue(value, variables))
    case Kind.OBJECT:
      return Object.fromEntries(node.fields.map((field) => [field.name.value, literalValue(field.value, variables)]))
    case Kind.VARIABLE:
      return variables?.[node.name.value]
    default:
      return undefined
  }
}

/** Type marker for fields and arguments that carry arbitrary JSON: `@Field(() => Json)`. */
export class Json {}

/**
 * Arbitrary JSON. Used for the raw OCPP notification going in (it is validated with zod in the
 * service, never trusted) and for the raw/before/after snapshots coming out.
 *
 * Declared as a Nest `@Scalar` class on purpose: Nest builds the scalar with its own copy of `graphql`
 * (CommonJS), while this file is ESM. A `GraphQLScalarType` created here would be a different class and
 * fail Nest's and graphql-js's `instanceof` checks.
 */
@Scalar('JSON', () => Json)
export class JsonScalar implements CustomScalar<unknown, unknown> {
  description = 'Arbitrary JSON value. Inputs are validated by the resolver that receives them.'

  serialize(value: unknown): unknown {
    return value
  }

  parseValue(value: unknown): unknown {
    return value
  }

  parseLiteral(node: ValueNode, variables?: Variables): unknown {
    return literalValue(node, variables)
  }
}
