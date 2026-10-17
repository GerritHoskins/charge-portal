<script lang="ts">
let vitalsRegistered = false

const registerVitalsOnce = (register: () => void) => {
  if (vitalsRegistered) return
  vitalsRegistered = true
  register()
}
</script>

<script setup lang="ts">
import { onCLS, onFCP, onINP, onLCP, onTTFB, type MetricWithAttribution } from 'web-vitals/attribution'
import type { VitalsBeacon } from '#shared/contracts/vitals'

const route = useRoute()

registerVitalsOnce(() => {
  // Demo telemetry only: no identity, cookie values, or third-party analytics are collected.
  const report = (metric: MetricWithAttribution) => {
    const path = route.path
    if (!path.startsWith('/shop')) return

    const rawTarget = metric.name === 'LCP'
      ? metric.attribution?.target
      : metric.name === 'INP'
        ? metric.attribution?.interactionTarget
        : undefined
    const target = rawTarget?.slice(0, 200)
    const payload: VitalsBeacon = {
      route: path,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
      ...(target ? { attribution: { target } } : {}),
    }
    const body = JSON.stringify(payload)

    if (navigator.sendBeacon('/api/vitals', body)) return
    void fetch('/api/vitals', {
      method: 'POST',
      body,
      headers: { 'content-type': 'text/plain' },
      keepalive: true,
      credentials: 'omit',
    }).catch(() => undefined)
  }

  onLCP(report)
  onINP(report)
  onCLS(report)
  onTTFB(report)
  onFCP(report)
})
</script>

<template>
  <span hidden aria-hidden="true" />
</template>
