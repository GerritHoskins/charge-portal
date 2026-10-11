import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DsStatusBadge from './DsStatusBadge.vue'

const meta = {
  title: 'Design System/StatusBadge',
  component: DsStatusBadge,
  tags: ['autodocs'],
  args: { status: 'available' },
} satisfies Meta<typeof DsStatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = {}
export const Charging: Story = { args: { status: 'charging' } }
export const Faulted: Story = { args: { status: 'faulted' } }
export const Offline: Story = { args: { status: 'offline' } }
