<script setup lang="ts">
import { computed, inject } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Slider } from '~/components/ui/slider'
import { Separator } from '~/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!
const fmt = new Intl.NumberFormat('ja-JP')

// --- 月額（万円）---
const monthlyInMan = computed({
  get: () => Math.round(engine.monthlyCompensation.value / 10_000),
  set: (v: number) => {
    engine.monthlyCompensation.value = Math.max(0, (Number(v) || 0)) * 10_000
  },
})

const monthlySlider = computed({
  get: () => [monthlyInMan.value],
  set: (v: number[]) => { monthlyInMan.value = v[0] },
})

// 月額上限: 利益 / 12（万円）
const maxMonthlyInMan = computed(() =>
  Math.max(1, Math.floor(engine.totalProfit.value / 12 / 10_000)),
)

// --- 賞与（万円）---
const bonusInMan = computed({
  get: () => Math.round(engine.bonusAmount.value / 10_000),
  set: (v: number) => {
    engine.bonusAmount.value = Math.max(0, (Number(v) || 0)) * 10_000
  },
})

const bonusSlider = computed({
  get: () => [bonusInMan.value],
  set: (v: number[]) => { bonusInMan.value = v[0] },
})

// 賞与上限: 利益（万円）
const maxBonusInMan = computed(() =>
  Math.max(0, Math.floor(engine.totalProfit.value / 10_000)),
)

const bonusCountStr = computed({
  get: () => String(engine.bonusCount.value),
  set: (v: string) => {
    const n = Number(v)
    if (n === 1 || n === 2 || n === 3) engine.bonusCount.value = n as 1 | 2 | 3
  },
})

const perPayment = computed(() =>
  engine.bonusAmount.value / Math.max(engine.bonusCount.value, 1),
)

// --- 配分バー ---
const segments = computed(() => {
  const total = engine.totalProfit.value
  if (total <= 0) return []
  const r = engine.result.value
  return [
    { label: '定期同額給与', amount: engine.monthlyCompensation.value * 12, color: 'bg-blue-500' },
    { label: '事前確定届出', amount: engine.bonusAmount.value, color: 'bg-purple-500' },
    { label: '社保(会社)', amount: r.socialInsurance.employerAnnual, color: 'bg-slate-500' },
    { label: '法人利益', amount: Math.max(0, r.corporateIncome), color: 'bg-emerald-500' },
  ].map((item) => ({ ...item, percent: Math.max(0, (item.amount / total) * 100) }))
})
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-medium">報酬配分</CardTitle>
    </CardHeader>
    <CardContent class="space-y-5">
      <!-- 月額定期同額給与 -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label class="text-xs font-medium">
            <span class="inline-block size-2 rounded-full bg-blue-500 mr-1" />
            月額定期同額給与
          </Label>
          <div class="flex items-center gap-2">
            <Input
              v-model.number="monthlyInMan"
              type="number"
              :min="0"
              class="w-20 text-right text-sm font-mono"
            />
            <span class="text-xs text-muted-foreground">万円/月</span>
          </div>
        </div>
        <Slider
          :model-value="monthlySlider"
          :min="0"
          :max="maxMonthlyInMan"
          :step="1"
          class="w-full"
          @update:model-value="monthlySlider = $event"
        />
        <p class="text-[10px] text-muted-foreground">
          × 12ヶ月 = {{ fmt.format(engine.monthlyCompensation.value * 12) }}円/年
        </p>
      </div>

      <Separator />

      <!-- 事前確定届出給与 -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label class="text-xs font-medium">
            <span class="inline-block size-2 rounded-full bg-purple-500 mr-1" />
            事前確定届出給与
          </Label>
          <div class="flex items-center gap-2">
            <Input
              v-model.number="bonusInMan"
              type="number"
              :min="0"
              class="w-20 text-right text-sm font-mono"
            />
            <span class="text-xs text-muted-foreground">万円/年</span>
          </div>
        </div>
        <Slider
          :model-value="bonusSlider"
          :min="0"
          :max="maxBonusInMan"
          :step="10"
          class="w-full"
          @update:model-value="bonusSlider = $event"
        />
        <div class="flex items-center justify-between">
          <div v-if="bonusInMan > 0" class="text-[10px] text-muted-foreground">
            1回あたり: ¥{{ fmt.format(perPayment) }}
          </div>
          <div class="flex items-center gap-2 ml-auto">
            <Label class="text-[10px] text-muted-foreground">支給回数</Label>
            <Select v-model="bonusCountStr">
              <SelectTrigger class="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1回</SelectItem>
                <SelectItem value="2">2回</SelectItem>
                <SelectItem value="3">3回</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <!-- 年間報酬合計（表示のみ）-->
      <div class="flex items-center justify-between">
        <span class="text-xs text-muted-foreground">年間報酬合計</span>
        <span class="text-sm font-mono font-bold">¥{{ fmt.format(engine.annualCompensation.value) }}</span>
      </div>

      <!-- 配分バー -->
      <div class="space-y-1.5">
        <div class="flex h-4 w-full overflow-hidden rounded-full bg-muted">
          <div
            v-for="seg in segments"
            :key="seg.label"
            :class="seg.color"
            :style="{ width: `${seg.percent}%` }"
            :title="`${seg.label}: ¥${fmt.format(seg.amount)}`"
            class="transition-all duration-200"
          />
        </div>
        <div class="flex flex-wrap gap-x-3 gap-y-1">
          <span
            v-for="seg in segments"
            :key="seg.label"
            class="flex items-center gap-1 text-[10px] text-muted-foreground"
          >
            <span :class="seg.color" class="inline-block size-2 rounded-full" />
            {{ seg.label }} ¥{{ fmt.format(seg.amount) }}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
