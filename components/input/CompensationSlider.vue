<script setup lang="ts">
import { computed, inject } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Slider } from '~/components/ui/slider'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!

const fmt = new Intl.NumberFormat('ja-JP')

const monthlyInMan = computed({
  get: () => Math.round(engine.monthlyCompensation.value / 10_000),
  set: (v: number) => {
    engine.monthlyCompensation.value = Math.max(0, v) * 10_000
  },
})

/** Slider model: array of one number (actual yen value) */
const sliderModel = computed({
  get: () => [engine.monthlyCompensation.value],
  set: (v: number[]) => {
    engine.monthlyCompensation.value = v[0] ?? 0
  },
})

const sliderMax = computed(() => {
  const maxMonthly = Math.floor(engine.totalProfit.value / 12)
  return Math.max(maxMonthly, 10_000)
})

const annualTotal = computed(
  () => engine.monthlyCompensation.value * 12,
)

// Allocation bar segments
const segments = computed(() => {
  const r = engine.result.value
  const total = engine.totalProfit.value
  if (total <= 0) return []

  const items = [
    { label: '定期同額給与', amount: annualTotal.value, color: 'bg-blue-500' },
    { label: '事前確定届出', amount: engine.bonusAmount.value, color: 'bg-purple-500' },
    { label: '社保(会社)', amount: r.socialInsurance.employerAnnual, color: 'bg-slate-500' },
    { label: '法人利益', amount: Math.max(0, r.corporateIncome), color: 'bg-emerald-500' },
  ]

  return items.map((item) => ({
    ...item,
    percent: Math.max(0, (item.amount / total) * 100),
  }))
})
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-medium">
        月額定期同額給与
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="flex items-center gap-3">
        <Label for="compensation-input" class="sr-only">月額</Label>
        <Input
          id="compensation-input"
          v-model.number="monthlyInMan"
          type="number"
          :min="0"
          class="w-28 text-right text-lg font-mono"
        />
        <span class="shrink-0 text-sm text-muted-foreground">万円/月</span>
      </div>

      <Slider
        v-model="sliderModel"
        :min="0"
        :max="sliderMax"
        :step="10000"
        class="w-full"
      />

      <p class="text-xs text-muted-foreground">
        月額 {{ fmt.format(engine.monthlyCompensation.value) }}円 x 12 =
        年額 {{ fmt.format(annualTotal) }}円
      </p>

      <!-- Allocation bar -->
      <div class="space-y-1.5">
        <p class="text-xs text-muted-foreground">利益配分</p>
        <div class="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            v-for="seg in segments"
            :key="seg.label"
            :class="seg.color"
            :style="{ width: `${seg.percent}%` }"
            :title="`${seg.label}: ${fmt.format(seg.amount)}円`"
            class="transition-all duration-300"
          />
        </div>
        <div class="flex flex-wrap gap-x-3 gap-y-1">
          <span
            v-for="seg in segments"
            :key="seg.label"
            class="flex items-center gap-1 text-[10px] text-muted-foreground"
          >
            <span :class="seg.color" class="inline-block size-2 rounded-full" />
            {{ seg.label }}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
