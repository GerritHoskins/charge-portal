import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DsDataTable from './DsDataTable.vue'

const meta = {
  title: 'Design System/DataTable',
  component: DsDataTable,
  tags: ['autodocs'],
  args: { caption: 'Ladestationen' },
  render: (args) => ({
    components: { DsDataTable },
    setup: () => ({ args }),
    template: `<DsDataTable v-bind="args">
      <template #head><tr><th scope="col">Name</th><th scope="col">Ort</th></tr></template>
      <tr><th scope="row">Hauptbahnhof Nord</th><td>Köln</td></tr>
      <tr><th scope="row">Messe Süd</th><td>Nürnberg</td></tr>
    </DsDataTable>`,
  }),
} satisfies Meta<typeof DsDataTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
