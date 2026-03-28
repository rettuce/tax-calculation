<script setup lang="ts">
import { computed, inject } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Slider } from '~/components/ui/slider'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!

const bonusInMan = computed({
  get: () => Math.round(engine.bonusAmount.value / 10_000),
  set: (v: number) => {
    engine.bonusAmount.value = Math.max(0, v) * 10_000
  },
})

// Slider value (array for shadcn Slider)
const sliderValue = computed({
  get: () => [bonusInMan.value],
  set: (v: number[]) => {
    bonusInMan.value = v[0]
  },
})

// Max bonus: remaining after monthly compensation and estimated employer SI
const maxBonusInMan = computed(() => {
  const remaining = engine.totalProfit.value - engine.monthlyCompensation.value * 12
  return Math.max(0, Math.floor(remaining / 100_000)) * 10 // 10万円刻みの上限
})

const bonusCountStr = computed({
  get: () => String(engine.bonusCount.value),
  set: (v: string) => {
    const n = Number(v)
    if (n === 1 || n === 2 || n === 3) {
      engine.bonusCount.value = n
    }
  },
})

const fmt = new Intl.NumberFormat('ja-JP')
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-medium">
        事前確定届出給与
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Slider -->
      <Slider
        :model-value="sliderValue"
        :min="0"
        :max="maxBonusInMan"
        :step="10"
        class="w-full"
        @update:model-value="sliderValue = $event"
      />

      <div class="flex items-center gap-3">
        <!-- Direct input -->
        <div class="flex items-center gap-2">
          <Input
            v-model.number="bonusInMan"
            type="number"
            :min="0"
            class="w-28 text-right text-lg font-mono"
          />
          <span class="shrink-0 text-sm text-muted-foreground">万円/年</span>
        </div>

        <!-- Payment count -->
        <div class="flex items-center gap-2 ml-auto">
          <Label class="text-xs text-muted-foreground">支給回数</Label>
          <Select v-model="bonusCountStr">
            <SelectTrigger class="w-24">
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

      <!-- Per-payment amount -->
      <div v-if="bonusInMan > 0" class="text-xs text-muted-foreground">
        1回あたり: ¥{{ fmt.format(engine.bonusAmount.value / engine.bonusCount.value) }}
      </div>
    </CardContent>
  </Card>
</template>
