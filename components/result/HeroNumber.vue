<script setup lang="ts">
import { computed, inject } from 'vue'
import { Card, CardContent } from '~/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!

const fmt = new Intl.NumberFormat('ja-JP')

const totalNet = computed(() => engine.result.value.totalNetIncome)
const personalNet = computed(() => engine.result.value.personalNetIncome)
const corporateRetained = computed(() => engine.result.value.corporateRetained)
const effectiveRate = computed(
  () => (engine.result.value.effectiveTaxRate * 100).toFixed(1),
)
const isDeficit = computed(() => totalNet.value < 0)
</script>

<template>
  <Card
    :class="[
      'overflow-hidden border-cyan-500/20',
      isDeficit ? 'bg-red-950/50 border-red-500/30' : 'bg-card',
    ]"
  >
    <CardContent class="p-6">
      <div class="flex items-center gap-1.5">
        <p class="text-xs text-muted-foreground">トータル手残り</p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <button type="button" class="inline-flex size-3.5 items-center justify-center rounded-full bg-muted text-[9px] text-muted-foreground">?</button>
            </TooltipTrigger>
            <TooltipContent>
              <p class="max-w-[240px] text-xs">個人の手取り＋法人内部留保の合計額。税・社保を差し引いた実質的な手残りです</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p
        :class="[
          'mt-1 text-3xl font-bold tracking-tight',
          isDeficit ? 'text-red-400' : 'text-cyan-400',
        ]"
      >
        ¥{{ fmt.format(totalNet) }}
      </p>
      <p class="mt-1 text-xs text-muted-foreground">
        実効税率: {{ effectiveRate }}%
      </p>

      <div class="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p class="text-[10px] text-muted-foreground">個人手取り</p>
          <p class="font-mono text-sm text-cyan-300">
            ¥{{ fmt.format(personalNet) }}
          </p>
        </div>
        <div>
          <p class="text-[10px] text-muted-foreground">法人内部留保</p>
          <p
            :class="[
              'font-mono text-sm',
              corporateRetained < 0 ? 'text-red-400' : 'text-cyan-300',
            ]"
          >
            ¥{{ fmt.format(corporateRetained) }}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
