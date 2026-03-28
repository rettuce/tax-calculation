<script setup lang="ts">
import { computed, inject } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!

const MAX_PROFIT_IN_MAN = 100_000 // 10億円

const profitInMan = computed({
  get: () => Math.round(engine.totalProfit.value / 10_000),
  set: (v: number) => {
    const safeValue = Number.isFinite(v) ? v : 0
    engine.totalProfit.value = Math.min(Math.max(0, safeValue), MAX_PROFIT_IN_MAN) * 10_000
  },
})
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <div class="flex items-center gap-2">
        <CardTitle class="text-sm font-medium">
          利益総額（役員報酬控除前）
        </CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                type="button"
                class="inline-flex size-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground"
              >
                ?
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p class="max-w-[240px] text-xs">
                売上から役員報酬以外のすべての経費を引いた金額です
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </CardHeader>
    <CardContent>
      <div class="flex items-center gap-2">
        <Label for="profit-input" class="sr-only">利益総額</Label>
        <Input
          id="profit-input"
          v-model.number="profitInMan"
          type="number"
          :min="0"
          class="text-right text-lg font-mono"
        />
        <span class="shrink-0 text-sm text-muted-foreground">万円</span>
      </div>
    </CardContent>
  </Card>
</template>
