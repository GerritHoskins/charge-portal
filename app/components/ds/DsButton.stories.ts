import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DsButton from './DsButton.vue'

const meta = {
  title: 'Design System/Button',
  component: DsButton,
  tags: ['autodocs'],
  render: (args) => ({ components: { DsButton }, setup: () => ({ args }), template: '<DsButton v-bind="args">Speichern</DsButton>' }),
  args: { variant: 'primary' },
} satisfies Meta<typeof DsButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Disabled: Story = { args: { disabled: true } }
