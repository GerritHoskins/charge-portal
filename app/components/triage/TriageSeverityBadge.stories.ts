import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TriageSeverityBadge from './TriageSeverityBadge.vue'

const meta = {
  title: 'Triage/SeverityBadge',
  component: TriageSeverityBadge,
  tags: ['autodocs'],
  args: { severity: 'major', label: 'Erheblich' },
} satisfies Meta<typeof TriageSeverityBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Info: Story = { args: { severity: 'info', label: 'Information' } }
export const Minor: Story = { args: { severity: 'minor', label: 'Gering' } }
export const Major: Story = {}
export const Critical: Story = { args: { severity: 'critical', label: 'Kritisch' } }
