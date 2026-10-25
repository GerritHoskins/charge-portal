# ADR 0008: Fault normalisation into one canonical taxonomy

**Status:** proposed

## Context

Charging stations report faults through OCPP 1.6 `StatusNotification`. Each message carries a
standardised `errorCode` (16 values, one of which is `OtherError`) and an optional free-text
`vendorErrorCode` plus `vendorId`. In practice the standard code is coarse (many vendors send
`OtherError` or `InternalError` for most faults) and the useful detail sits in the vendor code,
whose format and meaning differ per vendor: numeric codes, prefixed strings, free text, hex.

An operator with a mixed fleet cannot triage, report or dispatch on raw codes. The same physical
problem (a stuck connector lock, an overheating power module) arrives in many spellings, and a new
firmware version adds more. This is the same problem as a lift fleet that can fail in tens of
thousands of distinct ways: the value lies in collapsing those into a small set of classes that
drive decisions.

The repository already treats upstream data as untrusted and parses it at the boundary with zod
(`shared/contracts/*`, ADR 0001). Fault messages are another upstream boundary.

The vendors in this repository are fictional and their code tables are synthetic.

## Decision

1. **A canonical taxonomy, deliberately small.** Every fault normalises to
   `{ taxonomyCode, component, severity, requiresSiteVisit }`:
   - `component`: `connector`, `power-electronics`, `metering`, `communication`, `rfid-reader`,
     `firmware`, `thermal`, `grid-supply`.
   - `severity`: `info`, `minor`, `major`, `critical`.
   - `requiresSiteVisit`: whether a technician must go on site. This is the field that turns a fault
     into a cost, so it is explicit rather than derived from severity.
   - `taxonomyCode`: stable `AREA.NAME` identifier (e.g. `CON.LOCK_FAILURE`, `PWR.OVERCURRENT`)
     used for reporting and as the key the drafting step reasons about.
2. **Two-layer schemas, as in the catalogue contract.** Raw layer: `ocppStatusNotificationSchema`
   (OCPP 1.6 field names, `errorCode` as the closed OCPP enum, `vendorErrorCode` ≤ 50 chars). Canonical
   layer: `faultClassSchema`. A pure `normalise(raw)` maps one to the other and returns the class plus
   the `source` of the decision (`vendor-table`, `ocpp-default`, `unclassified`).
3. **Precedence: vendor table, then OCPP default, then `UNCLASSIFIED`.** A known `vendorId` with a
   matching code wins because it is the most specific evidence. Otherwise the OCPP `errorCode` maps
   to a default class. If neither yields a class (unknown vendor code with `OtherError`/
   `InternalError`), the result is `UNCLASSIFIED`.
4. **Unknown is safe, not silent.** `UNCLASSIFIED` uses `severity: major` and
   `requiresSiteVisit: true`, and the raw codes are always kept next to the class. Under-reacting to
   an unknown fault in the field is worse than an unnecessary review; the triage step (ADR 0010)
   gives an operator the chance to downgrade it, and the frequency of `unclassified` per vendor shows
   which tables need extending.
5. **Vendor code tables are data, validated by zod.** Each fictional vendor has a table keyed by its
   own code format, parsed with a schema at module load and covered by an exhaustive test that every
   entry maps to a valid class. Adding a vendor means adding a table and its fixture, not code paths.
6. **The taxonomy lives in its own workspace package** (`packages/fault-taxonomy`) so the NestJS
   service and the Nuxt BFF share one definition (ADR 0009).

## Consequences

- Reports, alerts and tickets are keyed by `taxonomyCode`, not by vendor strings.
- The taxonomy will need new classes over time. Adding a class is a reviewed change to an enum
  and a table, with tests; renaming one is a migration and is avoided.
- `UNCLASSIFIED` faults cause more site-visit drafts until tables catch up. That is the intended
  bias and is visible in the data.
- Free-text vendor codes are matched exactly after trimming and case-folding; there is no fuzzy
  matching in the normaliser. Interpreting free text is left to the drafting step, where a human
  approves the result.

## User and business value

Operators see one vocabulary for faults across a mixed fleet. "Does this need a technician?" is
answered by data, not by memory of each vendor's manual, and unknown faults are surfaced instead of
dropped. The approach scales by adding tables, which is the property a fleet with many device types
and failure modes needs.
