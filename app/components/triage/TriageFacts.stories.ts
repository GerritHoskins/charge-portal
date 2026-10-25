import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TriageFacts from './TriageFacts.vue'

const meta = {
  title: 'Triage/Facts',
  component: TriageFacts,
  tags: ['autodocs'],
  args: {
    items: [
      { term: 'Station', value: 'st-003' },
      { term: 'OCPP-Fehlercode', value: 'OtherError' },
      { term: 'Hersteller-Fehlercode', value: '1012' },
      { term: 'Schweregrad', value: 'Erheblich', severity: 'major' },
      { term: 'Aufgetreten', value: '25.10.2026, 08:12', datetime: '2026-10-25T06:12:03Z' },
    ],
  },
} satisfies Meta<typeof TriageFacts>

export default meta
type Story = StoryObj<typeof meta>

export const Fault: Story = {}
export const Draft: Story = {
  args: {
    items: [
      { term: 'Wahrscheinliche Ursache', value: 'Der Verriegelungsmotor ist blockiert.' },
      { term: 'Empfohlene Maßnahme', value: 'Verriegelung prüfen und ersetzen.' },
      { term: 'Konfidenz', value: '90 %' },
      { term: 'Erstellt von', value: 'rules' },
    ],
  },
}
