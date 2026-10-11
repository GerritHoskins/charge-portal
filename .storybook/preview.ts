import type { Preview } from '@storybook/vue3-vite'
import '../app/assets/css/tokens.css'
import '../app/assets/css/base.css'

const preview: Preview = {
  parameters: {
    // Fail the a11y panel on violations instead of only warning.
    a11y: { test: 'error' },
  },
  globalTypes: {
    tenant: {
      description: 'White-label tenant (token overrides)',
      toolbar: {
        title: 'Tenant',
        items: ['default', 'stadtwerke-demo', 'fleet-demo'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { tenant: 'default' },
  decorators: [
    (story, context) => {
      document.documentElement.setAttribute('data-tenant', String(context.globals.tenant))
      return { components: { story }, template: '<story />' }
    },
  ],
}

export default preview
