import { type FieldNode, Kind, parse, type OperationDefinitionNode, type ValueNode } from 'graphql'
import { describe, expect, it } from 'vitest'
import { JsonScalar } from '../../src/faults/json.scalar'

const literal = (source: string): ValueNode => {
  const operation = parse(`{ f(a: ${source}) }`).definitions[0] as OperationDefinitionNode
  const field = operation.selectionSet.selections[0] as FieldNode
  return field.arguments![0].value
}

const scalar = new JsonScalar()

describe('JSON scalar', () => {
  it('passes variable and result values through unchanged', () => {
    const value = { a: [1, 'two', null, { b: true }] }
    expect(scalar.parseValue(value)).toEqual(value)
    expect(scalar.serialize(value)).toEqual(value)
  })

  it('parses object, list and scalar literals', () => {
    expect(scalar.parseLiteral(literal('{ a: 1, b: "x", c: [true, null, 1.5], d: { e: ENUM } }'), {})).toEqual({
      a: 1,
      b: 'x',
      c: [true, null, 1.5],
      d: { e: 'ENUM' },
    })
  })

  it('resolves variables inside literals', () => {
    const node = literal('{ a: $v }')
    expect(node.kind).toBe(Kind.OBJECT)
    expect(scalar.parseLiteral(node, { v: 42 })).toEqual({ a: 42 })
  })
})
