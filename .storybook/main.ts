import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  framework: '@storybook/vue3-vite',
  stories: ['../app/components/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  viteFinal: (viteConfig) => {
    // Same alias Nuxt provides, so components importing '#shared/...' resolve.
    viteConfig.plugins = [...(viteConfig.plugins ?? []), vue()]
    viteConfig.resolve ??= {}
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias as Record<string, string> | undefined),
      '#shared': fileURLToPath(new URL('../shared', import.meta.url)),
    }
    return viteConfig
  },
}

export default config
