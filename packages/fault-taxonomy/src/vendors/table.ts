import { z } from 'zod'
import { TAXONOMY } from '../taxonomy'

// A vendor code table is data, validated when the module loads (ADR 0008, decision 5).
// Keys are stored in the canonical form produced by the vendor's own `canonicalise`, so lookup is
// an exact match after canonicalisation and there is no fuzzy matching.
export const vendorTableSchema = z
  .object({
    vendorId: z.string().min(1).max(255),
    canonicalise: z.custom<(code: string) => string>((v) => typeof v === 'function'),
    codes: z.record(
      z.string().min(1).max(50),
      z.string().refine((code) => code !== 'UNCLASSIFIED' && Object.hasOwn(TAXONOMY, code), {
        message: 'must be a class in TAXONOMY other than UNCLASSIFIED',
      }),
    ),
  })
  .superRefine((table, ctx) => {
    const keys = Object.keys(table.codes)
    if (keys.length === 0) ctx.addIssue({ code: 'custom', message: 'a vendor table needs at least one code', path: ['codes'] })
    for (const key of keys) {
      if (table.canonicalise(key) !== key) {
        ctx.addIssue({ code: 'custom', message: `key ${JSON.stringify(key)} is not in canonical form`, path: ['codes', key] })
      }
    }
  })

export interface VendorTable {
  readonly vendorId: string
  /** Maps a raw `vendorErrorCode` to the form used as table key. */
  readonly canonicalise: (code: string) => string
  /** Canonical vendor code -> taxonomyCode. */
  readonly codes: Readonly<Record<string, string>>
}

/** Validates and freezes a table. Throws a ZodError at module load if the table is malformed. */
export function defineVendorTable(table: VendorTable): VendorTable {
  const parsed = vendorTableSchema.parse(table)
  return Object.freeze({ vendorId: parsed.vendorId, canonicalise: table.canonicalise, codes: Object.freeze({ ...parsed.codes }) })
}
