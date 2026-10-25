import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TriageAuditTrail from './TriageAuditTrail.vue'

const created = { id: 'a1', datetime: '2026-10-25T06:12:04Z', time: '25.10.2026, 08:12', actor: 'agent:rules', action: 'Entwurf erstellt' }

const meta = {
  title: 'Triage/AuditTrail',
  component: TriageAuditTrail,
  tags: ['autodocs'],
  args: { entries: [created] },
} satisfies Meta<typeof TriageAuditTrail>

export default meta
type Story = StoryObj<typeof meta>

export const DraftOnly: Story = {}
export const Edited: Story = {
  args: {
    entries: [
      created,
      {
        id: 'a2',
        datetime: '2026-10-25T07:30:00Z',
        time: '25.10.2026, 09:30',
        actor: 'Demo Operator',
        action: 'Bearbeitet',
        changes: 'Geändert: Wahrscheinliche Ursache, Serviceeinsatz erforderlich',
      },
    ],
  },
}
