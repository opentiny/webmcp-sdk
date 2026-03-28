import { z, ZodTypeAny, ZodRawShape } from 'zod'

export type JsonSchema = {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null'
  description?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  enum?: Array<string | number | boolean | null>
  const?: string | number | boolean | null
  anyOf?: JsonSchema[]
  additionalProperties?: boolean
}

function getSchemaTypeName(schema: ZodTypeAny): string | undefined {
  return (schema as { _def?: { typeName?: string } })._def?.typeName
}

function getSchemaDescription(schema: ZodTypeAny): string | undefined {
  return (schema as { description?: string }).description
}

function withSchemaDescription(schema: ZodTypeAny, base: JsonSchema): JsonSchema {
  const description = getSchemaDescription(schema)
  return description ? { ...base, description } : base
}

function isOptionalSchema(schema: ZodTypeAny): boolean {
  const typeName = getSchemaTypeName(schema)
  if (typeName === z.ZodFirstPartyTypeKind.ZodOptional || typeName === z.ZodFirstPartyTypeKind.ZodDefault) {
    return true
  }
  if (typeName === z.ZodFirstPartyTypeKind.ZodEffects) {
    const inner = (schema as { _def: { schema: ZodTypeAny } })._def.schema
    return isOptionalSchema(inner)
  }
  return false
}

function toPrimitiveJsonType(value: unknown): JsonSchema['type'] {
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value === null) return 'null'
  return undefined
}

export function zodTypeToJsonSchema(schema: ZodTypeAny): JsonSchema {
  const typeName = getSchemaTypeName(schema)

  switch (typeName) {
    case z.ZodFirstPartyTypeKind.ZodString:
      return withSchemaDescription(schema, { type: 'string' })
    case z.ZodFirstPartyTypeKind.ZodNumber:
      return withSchemaDescription(schema, { type: 'number' })
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return withSchemaDescription(schema, { type: 'boolean' })
    case z.ZodFirstPartyTypeKind.ZodArray: {
      const itemSchema = (schema as { _def: { type: ZodTypeAny } })._def.type
      return withSchemaDescription(schema, { type: 'array', items: zodTypeToJsonSchema(itemSchema) })
    }
    case z.ZodFirstPartyTypeKind.ZodEnum: {
      const values = (schema as unknown as { options: string[] }).options ?? []
      return withSchemaDescription(schema, { type: 'string', enum: values })
    }
    case z.ZodFirstPartyTypeKind.ZodNativeEnum: {
      const rawValues = Object.values((schema as { _def: { values: Record<string, unknown> } })._def.values)
      const enumValues = rawValues.filter(
        (value): value is string | number => typeof value === 'string' || typeof value === 'number'
      )
      return withSchemaDescription(schema, { enum: enumValues })
    }
    case z.ZodFirstPartyTypeKind.ZodLiteral: {
      const literalValue = (schema as { _def: { value: unknown } })._def.value
      const primitiveType = toPrimitiveJsonType(literalValue)
      return withSchemaDescription(schema, {
        ...(primitiveType ? { type: primitiveType } : {}),
        const: (literalValue as string | number | boolean | null) ?? null
      })
    }
    case z.ZodFirstPartyTypeKind.ZodUnion: {
      const options = (schema as { _def: { options: ZodTypeAny[] } })._def.options ?? []
      return withSchemaDescription(schema, { anyOf: options.map((item) => zodTypeToJsonSchema(item)) })
    }
    case z.ZodFirstPartyTypeKind.ZodNullable: {
      const inner = (schema as { _def: { innerType: ZodTypeAny } })._def.innerType
      return withSchemaDescription(schema, { anyOf: [zodTypeToJsonSchema(inner), { type: 'null' }] })
    }
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const schemaDef = schema as { shape?: ZodRawShape; _def?: { shape?: ZodRawShape | (() => ZodRawShape) } }
      const shape =
        schemaDef.shape ??
        (typeof schemaDef._def?.shape === 'function' ? schemaDef._def.shape() : schemaDef._def?.shape) ??
        {}
      return withSchemaDescription(schema, zodShapeToJsonSchema(shape))
    }
    case z.ZodFirstPartyTypeKind.ZodEffects: {
      const inner = (schema as { _def: { schema: ZodTypeAny } })._def.schema
      return withSchemaDescription(schema, zodTypeToJsonSchema(inner))
    }
    case z.ZodFirstPartyTypeKind.ZodOptional:
    case z.ZodFirstPartyTypeKind.ZodDefault: {
      const inner = (schema as { _def: { innerType: ZodTypeAny } })._def.innerType
      return withSchemaDescription(schema, zodTypeToJsonSchema(inner))
    }
    default:
      return withSchemaDescription(schema, {})
  }
}

export function zodShapeToJsonSchema(shape: ZodRawShape = {}): JsonSchema {
  const properties: Record<string, JsonSchema> = {}
  const required: string[] = []

  Object.entries(shape).forEach(([key, schema]) => {
    properties[key] = zodTypeToJsonSchema(schema as ZodTypeAny)
    if (!isOptionalSchema(schema as ZodTypeAny)) {
      required.push(key)
    }
  })

  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false
  }
}
