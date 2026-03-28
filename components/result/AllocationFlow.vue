<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!

const fmt = new Intl.NumberFormat('ja-JP')

const hoveredIndex = ref<number | null>(null)

const segments = computed(() => {
  const r = engine.result.value
  const total = engine.totalProfit.value
  if (total <= 0) return []

  const items = [
    { label: '個人手取り', amount: r.personalNetIncome, color: 'bg-cyan-500' },
    { label: '所得税', amount: r.incomeTax, color: 'bg-amber-500' },
    { label: '住民税', amount: r.residentTax, color: 'bg-amber-600' },
    { label: '社保(個人)', amount: r.socialInsurance.employeeAnnual, color: 'bg-slate-400' },
    { label: '法人留保', amount: Math.max(0, r.corporateRetained), color: 'bg-teal-500' },
    { label: '法人税等', amount: r.corporateTaxTotal, color: 'bg-orange-500' },
    { label: '社保(会社)', amount: r.socialInsurance.employerAnnual, color: 'bg-slate-500' },
  ]

  return items
    .filter((item) => item.amount > 0)
    .map((item) => ({
      ...item,
      percent: (item.amount / total) * 100,
    }))
})
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-medium">利益配分フロー</CardTitle>
    </CardHeader>
    <CardContent class="space-y-3">
      <!-- Stacked bar -->
      <div class="flex h-6 w-full overflow-hidden rounded-full bg-muted">
        <div
          v-for="(seg, idx) in segments"
          :key="seg.label"
          :class="seg.color"
          :style="{ width: `${seg.percent}%` }"
          class="relative cursor-pointer transition-all duration-300 hover:brightness-125"
          @mouseenter="hoveredIndex = idx"
          @mouseleave="hoveredIndex = null"
        >
          <!-- Hover tooltip -->
          <div
            v-if="hoveredIndex === idx"
            class="absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-0.5 text-[10px] text-popover-foreground shadow"
          >
            {{ seg.label }}: {{ fmt.format(seg.amount) }}円
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="grid grid-cols-2 gap-x-4 gap-y-1">
        <div
          v-for="seg in segments"
          :key="seg.label"
          class="flex items-center justify-between gap-2 text-[10px]"
        >
          <span class="flex items-center gap-1 text-muted-foreground">
            <span :class="seg.color" class="inline-block size-2 rounded-sm" />
            {{ seg.label }}
          </span>
          <span class="font-mono tabular-nums">
            {{ fmt.format(seg.amount) }}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
