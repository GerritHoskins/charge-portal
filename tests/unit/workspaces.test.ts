import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  workspaces?: string[]
  scripts: Record<string, string>
}

describe('npm workspaces scaffold', () => {
  it('declares the packages/* and services/* workspaces', () => {
    expect(pkg.workspaces).toEqual(['packages/*', 'services/*'])
  })

  it('defines check:workspaces as a no-op-safe run over all workspaces', () => {
    expect(pkg.scripts['check:workspaces']).toBe('npm run check --workspaces --if-present')
  })

  it('runs check:workspaces in the root check, right after typecheck', () => {
    const steps = pkg.scripts.check!.split(' && ')
    const typecheck = steps.indexOf('npm run typecheck')
    expect(typecheck).toBeGreaterThanOrEqual(0)
    expect(steps[typecheck + 1]).toBe('npm run check:workspaces')
  })
})
