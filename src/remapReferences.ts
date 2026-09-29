import type { Block, Field } from 'payload'

/** Per collection slug: archived document ID -> ID of the matching document on this site. */
export type IdMaps = Map<string, Map<string, number | string>>

const mapId = (idMaps: IdMaps, slug: string, id: unknown) => {
  if (id === null || id === undefined || typeof id === 'object') return id
  return idMaps.get(slug)?.get(String(id)) ?? id
}

function remapRelationValue(
  idMaps: IdMaps,
  relationTo: string | string[],
  value: unknown,
): unknown {
  if (Array.isArray(value)) return value.map((v) => remapRelationValue(idMaps, relationTo, v))
  if (Array.isArray(relationTo)) {
    // Polymorphic: { relationTo, value }
    if (value && typeof value === 'object' && 'relationTo' in value) {
      const poly = value as { relationTo: string; value: unknown }
      return { ...poly, value: mapId(idMaps, poly.relationTo, poly.value) }
    }
    return value
  }
  return mapId(idMaps, relationTo, value)
}

// Rich text (Lexical) nodes that embed uploads/relationships carry { relationTo, value }.
function remapRichText(idMaps: IdMaps, node: unknown): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((child) => remapRichText(idMaps, child))
    return
  }
  const obj = node as Record<string, unknown>
  if (typeof obj.relationTo === 'string' && 'value' in obj) {
    obj.value = mapId(idMaps, obj.relationTo, obj.value)
  }
  Object.values(obj).forEach((child) => remapRichText(idMaps, child))
}

/**
 * Rewrites relationship/upload IDs inside `data` (in place) using `idMaps`, so documents keep
 * pointing at the right records when a referenced doc exists on this site under a different ID.
 */
export function remapReferences(
  fields: Field[],
  data: unknown,
  idMaps: IdMaps,
  blocks: Block[],
): void {
  if (!data || typeof data !== 'object' || idMaps.size === 0) return
  const doc = data as Record<string, unknown>

  for (const field of fields) {
    switch (field.type) {
      case 'upload':
      case 'relationship':
        if (field.name in doc)
          doc[field.name] = remapRelationValue(idMaps, field.relationTo, doc[field.name])
        break
      case 'richText':
        remapRichText(idMaps, doc[field.name])
        break
      case 'array':
        if (Array.isArray(doc[field.name])) {
          for (const row of doc[field.name] as unknown[])
            remapReferences(field.fields, row, idMaps, blocks)
        }
        break
      case 'blocks':
        if (Array.isArray(doc[field.name])) {
          for (const row of doc[field.name] as Record<string, unknown>[]) {
            const block =
              field.blocks.find((b) => b.slug === row?.blockType) ??
              blocks.find((b) => b.slug === row?.blockType)
            if (block) remapReferences(block.fields, row, idMaps, blocks)
          }
        }
        break
      case 'group':
        remapReferences(
          field.fields,
          'name' in field && field.name ? doc[field.name] : doc,
          idMaps,
          blocks,
        )
        break
      case 'tabs':
        for (const tab of field.tabs) {
          remapReferences(
            tab.fields,
            'name' in tab && tab.name ? doc[tab.name] : doc,
            idMaps,
            blocks,
          )
        }
        break
      case 'row':
      case 'collapsible':
        remapReferences(field.fields, doc, idMaps, blocks)
        break
    }
  }
}
