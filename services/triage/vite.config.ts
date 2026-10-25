import { defineConfig } from 'vite'
import { swcPlugin } from './swc.plugin.ts'

// Production build: a Node ESM bundle in dist/ (`main.js` = service, `data-source.js` = TypeORM CLI, `seed.js` = E2E database and fixture seeding).
// - Third-party packages from node_modules stay external (installed at runtime, native `pg` etc.).
// - `@charge-portal/*` workspace packages are bundled in (`noExternal`), because they ship TypeScript source.
export default defineConfig({
  plugins: [swcPlugin()],
  // Compile with SWC only; Vite's own TS transform must not touch the sources first.
  oxc: false,
  ssr: { noExternal: [/^@charge-portal\//] },
  build: {
    ssr: true,
    target: 'node24',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    rollupOptions: {
      input: { main: 'src/main.ts', 'data-source': 'src/data-source.ts', seed: 'src/seed/cli.ts' },
      output: { format: 'es', entryFileNames: '[name].js', chunkFileNames: 'chunks/[name]-[hash].js' },
    },
  },
})
