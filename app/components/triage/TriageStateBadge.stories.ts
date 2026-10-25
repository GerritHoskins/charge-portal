import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TriageStateBadge from './TriageStateBadge.vue'

const meta = {
  title: 'Triage/StateBadge',
  component: TriageStateBadge,
  tags: ['autodocs'],
  args: { state: 'ok', label: 'In Ordnung' },
} satisfies Meta<typeof TriageStateBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Ok: Story = {}
export const Degraded: Story = { args: { state: 'degraded', label: 'Eingeschränkt' } }
export const NeedsVisit: Story = { args: { state: 'needs-visit', label: 'Serviceeinsatz nötig' } }
export const Offline: Story = { args: { state: 'offline', label: 'Keine Verbindung' } }
