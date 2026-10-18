import { funnel } from '#shared/contracts/events'
import { shopEvents } from '../events.post'

export default defineEventHandler(() => funnel(shopEvents))
