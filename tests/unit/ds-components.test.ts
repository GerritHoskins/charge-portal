import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DsAlert from '../../app/components/ds/DsAlert.vue'
import DsButton from '../../app/components/ds/DsButton.vue'
import DsDataTable from '../../app/components/ds/DsDataTable.vue'
import DsStatusBadge from '../../app/components/ds/DsStatusBadge.vue'
import DsTextField from '../../app/components/ds/DsTextField.vue'

describe('DsButton', () => {
  it('defaults to type=button so it never submits a form by accident', () => {
    expect(mount(DsButton, { slots: { default: 'Ok' } }).attributes('type')).toBe('button')
  })

  it('renders the variant class and the slot', () => {
    const w = mount(DsButton, { props: { variant: 'secondary', type: 'submit' }, slots: { default: 'Senden' } })
    expect(w.classes()).toContain('ds-button--secondary')
    expect(w.attributes('type')).toBe('submit')
    expect(w.text()).toBe('Senden')
  })

  it('can be disabled', () => {
    expect(mount(DsButton, { props: { disabled: true } }).attributes('disabled')).toBeDefined()
  })
})

describe('DsAlert', () => {
  it('errors are role=alert, info is role=status', () => {
    expect(mount(DsAlert).attributes('role')).toBe('alert')
    expect(mount(DsAlert, { props: { tone: 'info' } }).attributes('role')).toBe('status')
  })

  it('is programmatically focusable (error summary pattern)', () => {
    const w = mount(DsAlert, { attachTo: document.body })
    ;(w.vm as unknown as { focus: () => void }).focus()
    expect(document.activeElement).toBe(w.element)
    w.unmount()
  })
})

describe('DsTextField', () => {
  it('links label, hint and error to the control', () => {
    const w = mount(DsTextField, { props: { id: 'm', label: 'Nachricht', hint: 'Hinweis', error: 'Falsch' } })
    expect(w.find('label').attributes('for')).toBe('m')
    const control = w.find('#m')
    expect(control.attributes('aria-invalid')).toBe('true')
    expect(control.attributes('aria-describedby')).toBe('m-hint m-error')
    expect(w.find('#m-error').text()).toContain('Falsch')
  })

  it('has no aria-invalid or describedby without hint and error', () => {
    const control = mount(DsTextField, { props: { id: 'u', label: 'User' } }).find('#u')
    expect(control.attributes('aria-invalid')).toBeUndefined()
    expect(control.attributes('aria-describedby')).toBeUndefined()
  })

  it('renders a textarea when multiline and forwards native attributes', () => {
    const w = mount(DsTextField, { props: { id: 'a', label: 'A', multiline: true }, attrs: { name: 'a', maxlength: '5' } })
    expect(w.find('textarea').attributes('name')).toBe('a')
    expect(w.find('textarea').attributes('maxlength')).toBe('5')
  })

  it('supports v-model', async () => {
    const w = mount(DsTextField, {
      props: { id: 'v', label: 'V', modelValue: '', 'onUpdate:modelValue': (v: string) => w.setProps({ modelValue: v }) },
    })
    await w.find('input').setValue('hallo')
    expect(w.props('modelValue')).toBe('hallo')
  })

  it('marks required fields with text, not colour', () => {
    expect(mount(DsTextField, { props: { id: 'r', label: 'R', requiredText: '(Pflichtfeld)' } }).text()).toContain('(Pflichtfeld)')
  })
})

describe('DsDataTable', () => {
  it('always has a caption as accessible name', () => {
    const w = mount(DsDataTable, {
      props: { caption: 'Stationen' },
      slots: { head: '<tr><th scope="col">A</th></tr>', default: '<tr><td>1</td></tr>' },
    })
    expect(w.find('caption').text()).toBe('Stationen')
    expect(w.findAll('th[scope="col"]')).toHaveLength(1)
  })
})

describe('DsStatusBadge label override', () => {
  it('shows a translated label when given', () => {
    expect(mount(DsStatusBadge, { props: { status: 'faulted', label: 'Fault' } }).text()).toBe('Fault')
  })
})
