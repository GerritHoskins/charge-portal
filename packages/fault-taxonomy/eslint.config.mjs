import rootConfig from '../../eslint.config.mjs'

// Reuse the root rules. The root config ignores `packages/**` (each workspace owns its lint run),
// so the ignore-only entries are dropped here and this package is linted on its own.
export default rootConfig.filter((entry) => !(Object.keys(entry).length === 1 && 'ignores' in entry))
