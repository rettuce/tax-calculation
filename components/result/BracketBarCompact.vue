<script setup lang="ts">
import { computed, inject } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import { taxRates2025 } from '~/config/tax-rates/2025'
import { corporateTax2025 } from '~/config/corporate-tax'

const props = defineProps<{
  title: string
  type: 'income' | 'corporate'
}>()

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!

const fmt = new Intl.NumberFormat('ja-JP')

interface BracketSegment {
  label: string
  rate: number
  min: number
  max: number
  displayMax: number
  width: number
  color: string
  description: string
}

const INCOME_COLORS = [
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500',
]
const INCOME_DESCRIPTIONS = [
  '195万円以下: 最低税率。控除額なし',
  '195万超〜330万: 給与所得控除後に多くの人がここ',
  '330万超〜695万: 中間層の税率',
  '695万超〜900万: ここを超えると負担感が増す',
  '900万超〜1,800万: 高額報酬の税率',
  '1,800万超〜4,000万: 超高額報酬',
  '4,000万超: 最高税率',
]

const CORPORATE_COLORS = ['bg-emerald-500', 'bg-teal-500']
const CORPORATE_DESCRIPTIONS = [
  '800万円以下: 中小法人の軽減税率15%',
  '800万円超: 通常税率23.2%',
]

const currentValue = computed(() => {
  if (props.type === 'income') return engine.result.value.incomeTaxableIncome
  return Math.max(0, engine.result.value.corporateIncome)
})

const brackets = computed<BracketSegment[]>(() => {
  if (props.type === 'income') {
    const maxDisplay = 50_000_000
    return taxRates2025.incomeTaxBrackets.map((b, i) => {
      const displayMax = Math.min(b.max, maxDisplay)
      return {
        label: `${(b.rate * 100).toFixed(0)}%`,
        rate: b.rate,
        min: b.min === 1_000 ? 0 : b.min, // 最低ブラケットは0から表示
        max: b.max,
        displayMax,
        width: (displayMax - (b.min === 1_000 ? 0 : b.min)) / maxDisplay * 100,
        color: INCOME_COLORS[i] ?? INCOME_COLORS[INCOME_COLORS.length - 1],
        description: INCOME_DESCRIPTIONS[i] ?? '',
      }
    })
  }

  const maxDisplay = 20_000_000
  return corporateTax2025.corporateTaxBrackets.map((b, i) => {
    const min = i === 0 ? 0 : corporateTax2025.corporateTaxBrackets[i - 1].maxIncome
    const displayMax = Math.min(b.maxIncome, maxDisplay)
    return {
      label: `${(b.rate * 100).toFixed(1)}%`,
      rate: b.rate,
      min,
      max: b.maxIncome,
      displayMax,
      width: (displayMax - min) / maxDisplay * 100,
      color: CORPORATE_COLORS[i] ?? CORPORATE_COLORS[CORPORATE_COLORS.length - 1],
      description: CORPORATE_DESCRIPTIONS[i] ?? '',
    }
  })
})

const currentBracket = computed(() => {
  const val = currentValue.value
  if (val <= 0) return brackets.value[0] // 0円は最低ブラケット
  return brackets.value.find((b) => val >= b.min && val <= b.max) ?? brackets.value[0]
})

const positionPercent = computed(() => {
  const val = currentValue.value
  const maxDisplay = props.type === 'income' ? 50_000_000 : 20_000_000
  return Math.min(100, Math.max(0, (val / maxDisplay) * 100))
})

const nextBracketInfo = computed(() => {
  const val = currentValue.value
  const current = currentBracket.value
  if (!current) return null

  const idx = brackets.value.indexOf(current)
  if (idx < brackets.value.length - 1) {
    const remaining = current.max - val
    // max が Infinity の場合は表示しない
    if (!isFinite(remaining) || remaining < 0) return null
    const nextRate = brackets.value[idx + 1].rate
    return {
      remaining,
      nextRate: `${(nextRate * 100).toFixed(0)}%`,
    }
  }
  return null
})
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <div class="flex items-center gap-1.5">
        <CardTitle class="text-sm font-medium">{{ title }}</CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <button type="button" class="inline-flex size-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">?</button>
            </TooltipTrigger>
            <TooltipContent>
              <p class="max-w-[240px] text-xs">
                {{ type === 'income'
                  ? '現在の課税所得が所得税の累進税率のどこに位置するかを表示。次のブラケットまでの距離も確認できます'
                  : '法人所得に対する法人税率の区分。800万円を境に税率が変わります'
                }}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </CardHeader>
    <CardContent class="space-y-3">
      <!-- Bracket bar -->
      <div class="relative">
        <div class="flex h-4 w-full overflow-hidden rounded-full bg-muted">
          <div
            v-for="b in brackets"
            :key="b.label + b.min"
            :class="b.color"
            :style="{ width: `${b.width}%` }"
            :title="`${b.label}: ${fmt.format(b.min)}〜${isFinite(b.max) ? fmt.format(b.max) + '円' : ''}`"
            class="relative transition-all"
          >
            <span
              v-if="b.width > 8"
              class="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/80"
            >
              {{ b.label }}
            </span>
          </div>
        </div>

        <!-- Position marker -->
        <div
          v-if="currentValue > 0"
          class="absolute top-0 h-4 w-0.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] transition-all duration-300"
          :style="{ left: `${positionPercent}%` }"
        />
      </div>

      <!-- Current info -->
      <div class="text-xs text-muted-foreground">
        <template v-if="currentValue > 0">
          現在: <span class="font-medium text-foreground">{{ currentBracket?.label }}</span>ブラケット
          <span class="font-mono">(課税所得 ¥{{ fmt.format(currentValue) }})</span>
          <template v-if="nextBracketInfo">
            <br />
            次の{{ nextBracketInfo.nextRate }}まで:
            <span class="font-mono text-foreground">あと¥{{ fmt.format(nextBracketInfo.remaining) }}</span>
          </template>
        </template>
        <template v-else>
          課税所得: ¥0
        </template>
      </div>

      <!-- Detail accordion -->
      <Accordion type="single" collapsible class="w-full">
        <AccordionItem value="detail" class="border-none">
          <AccordionTrigger class="py-1 text-[10px] text-muted-foreground">
            詳細を見る
          </AccordionTrigger>
          <AccordionContent>
            <div class="space-y-2 pt-1">
              <div
                v-for="b in brackets"
                :key="b.label + b.min"
                :class="[
                  'flex items-start gap-2 rounded-md p-1.5 text-[10px]',
                  currentBracket === b ? 'bg-muted' : '',
                ]"
              >
                <span :class="b.color" class="mt-0.5 inline-block size-3 shrink-0 rounded-sm" />
                <div>
                  <span class="font-medium text-foreground">{{ b.label }}</span>
                  <span class="text-muted-foreground">
                    ({{ fmt.format(b.min) }}〜{{ isFinite(b.max) ? fmt.format(b.max) + '円' : '' }})
                  </span>
                  <p class="text-muted-foreground">{{ b.description }}</p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </CardContent>
  </Card>
</template>
