<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import type { OptimizationGoal } from '~/utils/optimizer'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!

const isRunning = ref(false)

const goals: { value: OptimizationGoal; label: string; description: string }[] = [
  { value: 'maxTotalRetained', label: 'トータル手残り最大化', description: '個人手取り＋法人留保の合計を最大化' },
  { value: 'maxNetIncome', label: '個人手取り最大化', description: '個人の手取額のみを最大化（法人留保は無視）' },
  { value: 'minSocialInsurance', label: '社保最小化', description: '社会保険料の総額を最小化' },
]

const minMonthlyInMan = computed({
  get: () => Math.round(engine.minMonthlyCompensation.value / 10_000),
  set: (v: number) => {
    engine.minMonthlyCompensation.value = Math.max(0, (Number(v) || 0)) * 10_000
  },
})

async function handleOptimize() {
  isRunning.value = true
  await new Promise((resolve) => setTimeout(resolve, 50))
  engine.runOptimization()
  isRunning.value = false
}
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-medium">
        最適化ゴール
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <div
          v-for="goal in goals"
          :key="goal.value"
          class="flex items-start gap-2"
        >
          <input
            :id="`goal-${goal.value}`"
            v-model="engine.optimizationGoal.value"
            type="radio"
            name="optimization-goal"
            :value="goal.value"
            class="mt-0.5 size-4 accent-primary"
          />
          <Label
            :for="`goal-${goal.value}`"
            class="cursor-pointer"
          >
            <span class="text-sm">{{ goal.label }}</span>
            <span class="block text-[10px] text-muted-foreground">{{ goal.description }}</span>
          </Label>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Label class="shrink-0 text-xs">月額下限</Label>
        <Input
          v-model.number="minMonthlyInMan"
          type="number"
          :min="0"
          class="w-20 text-right text-sm font-mono"
        />
        <span class="text-xs text-muted-foreground">万円</span>
      </div>

      <Button
        class="w-full"
        :disabled="isRunning"
        @click="handleOptimize"
      >
        {{ isRunning ? '計算中...' : '最適化実行' }}
      </Button>

      <p
        v-if="engine.optimizationResult.value"
        class="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground"
      >
        {{ engine.optimizationResult.value.reason }}
      </p>
    </CardContent>
  </Card>
</template>
