<script setup lang="ts">
import { inject, ref } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import type { OptimizationGoal } from '~/utils/optimizer'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!

const isRunning = ref(false)

const goals: { value: OptimizationGoal; label: string }[] = [
  { value: 'maxNetIncome', label: '手取り最大化' },
  { value: 'maxTotalRetained', label: 'トータル手残り最大化' },
  { value: 'minTaxRate', label: '実効税率最小化' },
  { value: 'minSocialInsurance', label: '社保最小化' },
]

async function handleOptimize() {
  isRunning.value = true
  // Allow UI to update before running heavy computation
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
          class="flex items-center gap-2"
        >
          <input
            :id="`goal-${goal.value}`"
            v-model="engine.optimizationGoal.value"
            type="radio"
            name="optimization-goal"
            :value="goal.value"
            class="size-4 accent-primary"
          />
          <Label
            :for="`goal-${goal.value}`"
            class="cursor-pointer text-sm"
          >
            {{ goal.label }}
          </Label>
        </div>
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
