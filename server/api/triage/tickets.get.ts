// BFF endpoint: the triage queue (newest first), contract-checked. ?state=draft|approved|edited|rejected
export default defineEventHandler((event) => listTickets(event, getQuery(event).state))
