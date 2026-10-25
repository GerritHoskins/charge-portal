// BFF endpoint: live state and active alerts per station from the triage service, contract-checked,
// most urgent first. The page treats any error as "live state unavailable" (legacy data still renders).
export default defineEventHandler((event) => listStationStates(event))
