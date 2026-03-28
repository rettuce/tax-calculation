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

// ============================================================
// 年間報酬合計 = 月額×12 + 賞与
// マスタースライダーで合計を動かすと比率維持で配分
// 月額を動かすと → 賞与 = 合計 - 月額×12（合計は変わらない）
// 賞与を動かすと → 月額 = (合計 - 賞与) / 12（合計は変わらない）
// ============================================================

// 年間報酬合計の上限 = 利益総額（社保は報酬から算出されるので上限に含めない）
const maxAnnualInMan = computed(() => Math.floor(engine.totalProfit.value / 10_000))

// --- 年間報酬合計（マスター）---
const annualCompInMan = computed({
  get: () => Math.round(engine.annualCompensation.value / 10_000),
  set: (v: number) => {
    const newTotal = Math.max(0, Math.min(v, maxAnnualInMan.value)) * 10_000
    const currentTotal = engine.annualCompensation.value
    if (currentTotal > 0 && engine.monthlyCompensation.value > 0) {
      // 現在の月額/賞与比率を維持
      const monthlyShare = (engine.monthlyCompensation.value * 12) / currentTotal
      const newMonthlyAnnual = Math.round(newTotal * monthlyShare / 10_000) * 10_000
      const newMonthly = Math.round(newMonthlyAnnual / 12 / 10_000) * 10_000
      engine.monthlyCompensation.value = newMonthly
      engine.bonusAmount.value = Math.max(0, newTotal - newMonthly * 12)
    } else {
      // 全額を月額に
      engine.monthlyCompensation.value = Math.round(newTotal / 12 / 10_000) * 10_000
      engine.bonusAmount.value = Math.max(0, newTotal - engine.monthlyCompensation.value * 12)
    }
  },
})

const annualSlider = computed({
  get: () => [annualCompInMan.value],
  set: (v: number[]) => { annualCompInMan.value = v[0] },
})

// --- 月額（合計を固定して賞与が連動）---
const monthlyInMan = computed({
  get: () => Math.round(engine.monthlyCompensation.value / 10_000),
  set: (v: number) => {
    const total = engine.annualCompensation.value
    const newMonthly = Math.max(0, v) * 10_000
    engine.monthlyCompensation.value = newMonthly
    // 合計を維持: 賞与 = 合計 - 月額×12
    engine.bonusAmount.value = Math.max(0, total - newMonthly * 12)
  },
})

const monthlySlider = computed({
  get: () => [monthlyInMan.value],
  set: (v: number[]) => { monthlyInMan.value = v[0] },
})

// 月額の上限 = 合計 / 12（賞与を0にした場合の上限）
const maxMonthlyInMan = computed(() => {
  const total = engine.annualCompensation.value
  return Math.max(0, Math.floor(total / 12 / 10_000))
})

// --- 賞与（合計を固定して月額が連動）---
const bonusInMan = computed({
  get: () => Math.round(engine.bonusAmount.value / 10_000),
  set: (v: number) => {
    const total = engine.annualCompensation.value
    const newBonus = Math.max(0, v) * 10_000
    engine.bonusAmount.value = newBonus
    // 合計を維持: 月額 = (合計 - 賞与) / 12
    const remaining = Math.max(0, total - newBonus)
    engine.monthlyCompensation.value = Math.floor(remaining / 12 / 10_000) * 10_000
  },
})

const bonusSlider = computed({
  get: () => [bonusInMan.value],
  set: (v: number[]) => { bonusInMan.value = v[0] },
})

// 賞与の上限 = 合計（月額を0にした場合の上限）
const maxBonusInMan = computed(() => {
  const total = engine.annualCompensation.value
  return Math.max(0, Math.floor(total / 10_000))
})

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
      <!-- 年間報酬合計（マスター）-->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label class="text-xs text-muted-foreground">年間報酬合計</Label>
          <div class="flex items-center gap-2">
            <Input
              v-model.number="annualCompInMan"
              type="number"
              :min="0"
              class="w-24 text-right text-sm font-mono"
            />
            <span class="text-xs text-muted-foreground">万円</span>
          </div>
        </div>
        <Slider
          :model-value="annualSlider"
          :min="0"
          :max="maxAnnualInMan"
          :step="10"
          class="w-full"
          @update:model-value="annualSlider = $event"
        />
        <p class="text-[10px] text-muted-foreground text-right">
          上限: {{ fmt.format(engine.totalProfit.value) }}円（利益総額）
        </p>
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
            {{ seg.label }} {{ fmt.format(seg.amount) }}円
          </span>
        </div>
      </div>

      <Separator />

      <!-- 月額定期同額給与（合計固定、賞与が連動）-->
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

      <!-- 事前確定届出給与（合計固定、月額が連動）-->
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
    </CardContent>
  </Card>
</template>
