import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DsTextField from './DsTextField.vue'

const meta = {
  title: 'Design System/TextField',
  component: DsTextField,
  tags: ['autodocs'],
  args: { id: 'field', label: 'Benutzername', modelValue: '' },
} satisfies Meta<typeof DsTextField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithHint: Story = { args: { hint: 'Mindestens 10 Zeichen.', requiredText: '(Pflichtfeld)' } }
export const WithError: Story = { args: { hint: 'Mindestens 10 Zeichen.', error: 'Bitte ausfüllen.' } }
export const Multiline: Story = { args: { label: 'Beschreibung', multiline: true, rows: 4 } }
