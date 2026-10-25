import swc from 'unplugin-swc'
import type { Plugin } from 'vite'

/**
 * One SWC setup shared by vitest (unit + integration) and `vite build`, so tests and the shipped
 * bundle compile the code the same way.
 *
 * Why SWC: Nest dependency injection, TypeORM columns and GraphQL fields rely on
 * `emitDecoratorMetadata` (`design:paramtypes`/`design:type`). esbuild/oxc (tsx, plain Vite) do not emit it.
 *
 * Workspace TypeScript dependencies (e.g. `@charge-portal/fault-taxonomy`, whose package.json exports
 * `./src/index.ts`): npm links them into node_modules, Vite resolves the symlink to the real path under
 * `packages/`, so the file is NOT treated as a node_modules dependency. Vitest therefore transforms it
 * through this plugin, and `vite build` bundles it (see `ssr.noExternal` in vite.config.ts) instead of
 * leaving a bare `import` of a `.ts` file that plain Node could not load at runtime.
 */
export function swcPlugin(): Plugin {
  return swc.vite({
    jsc: {
      target: 'es2022',
      parser: { syntax: 'typescript', decorators: true },
      transform: { legacyDecorator: true, decoratorMetadata: true },
      keepClassNames: true,
    },
    // `unplugin-swc` skips tsconfig discovery when this is set; we configure SWC explicitly above.
    tsconfigFile: false,
  }) as Plugin
}
