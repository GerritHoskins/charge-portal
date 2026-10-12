import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DsAlert from './DsAlert.vue'

const meta = {
  title: 'Design System/Alert',
  component: DsAlert,
  tags: ['autodocs'],
  render: (args) => ({
    components: { DsAlert },
    setup: () => ({ args }),
    template: '<DsAlert v-bind="args"><p>Die Daten konnten nicht geladen werden.</p></DsAlert>',
  }),
  args: { tone: 'error' },
} satisfies Meta<typeof DsAlert>

export default meta
type Story = StoryObj<typeof meta>

export const Error: Story = {}
export const Info: Story = { args: { tone: 'info' } }
