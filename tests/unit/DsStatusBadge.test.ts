import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DsStatusBadge from '../../app/components/ds/DsStatusBadge.vue'

describe('DsStatusBadge', () => {
  it.each([
    ['available', 'Verfügbar'],
    ['charging', 'Lädt'],
    ['faulted', 'Störung'],
    ['offline', 'Offline'],
  ] as const)('renders a text label for %s (not colour alone)', (status, label) => {
    const wrapper = mount(DsStatusBadge, { props: { status } })
    expect(wrapper.text()).toBe(label)
    expect(wrapper.classes()).toContain(`ds-badge--${status}`)
  })
})
