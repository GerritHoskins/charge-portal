import { vitalsStore } from '../vitals.post'

export default defineEventHandler(() => vitalsStore.summary())
