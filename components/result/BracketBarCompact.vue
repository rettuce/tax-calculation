<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
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
  width: number
  color: string
}

const INCOME_COLORS = [
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
]

const CORPORATE_COLORS = [
  'bg-emerald-500',
  'bg-teal-500',
]

const currentValue = computed(() => {
  if (props.type === 'income') {
    return engine.result.value.incomeTaxableIncome
  }
  return Math.max(0, engine.result.value.corporateIncome)
})

const brackets = computed<BracketSegment[]>(() => {
  if (props.type === 'income') {
    const maxDisplay = 50_000_000
    return taxRates2025.incomeTaxBrackets.map((b, i) => ({
      label: `${(b.rate * 100).toFixed(0)}%`,
      rate: b.rate,
      min: b.min,
      max: Math.min(b.max, maxDisplay),
      width: (Math.min(b.max, maxDisplay) - b.min) / maxDisplay * 100,
      color: INCOME_COLORS[i] ?? INCOME_COLORS[INCOME_COLORS.length - 1],
    }))
  }

  // Corporate
  const maxDisplay = 20_000_000
  return corporateTax2025.corporateTaxBrackets.map((b, i) => ({
    label: `${(b.rate * 100).toFixed(1)}%`,
    rate: b.rate,
    min: i === 0 ? 0 : corporateTax2025.corporateTaxBrackets[i - 1].maxIncome,
    max: Math.min(b.maxIncome, maxDisplay),
    width: (Math.min(b.maxIncome, maxDisplay) - (i === 0 ? 0 : corporateTax2025.corporateTaxBrackets[i - 1].maxIncome)) / maxDisplay * 100,
    color: CORPORATE_COLORS[i] ?? CORPORATE_COLORS[CORPORATE_COLORS.length - 1],
  }))
})

const currentBracket = computed(() => {
  const val = currentValue.value
  return brackets.value.find((b) => val >= b.min && val <= b.max)
})

const positionPercent = computed(() => {
  const val = currentValue.value
  const maxDisplay = props.type === 'income' ? 50_000_000 : 20_000_000
  return Math.min(100, (val / maxDisplay) * 100)
})

const nextBracketInfo = computed(() => {
  const val = currentValue.value
  const current = currentBracket.value
  if (!current) return null

  const idx = brackets.value.indexOf(current)
  if (idx < brackets.value.length - 1) {
    const remaining = current.max - val
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
      <CardTitle class="text-sm font-medium">{{ title }}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-3">
      <!-- Bracket bar with position marker -->
      <div class="relative">
        <div class="flex h-4 w-full overflow-hidden rounded-full bg-muted">
          <div
            v-for="b in brackets"
            :key="b.label"
            :class="b.color"
            :style="{ width: `${b.width}%` }"
            :title="`${b.label}: ${fmt.format(b.min)}~${fmt.format(b.max)}円`"
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
          class="absolute top-0 h-4 w-0.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] transition-all duration-300"
          :style="{ left: `${positionPercent}%` }"
        />
      </div>

      <!-- Current bracket info -->
      <div class="text-xs text-muted-foreground">
        <span v-if="currentBracket">
          現在: <span class="font-medium text-foreground">{{ currentBracket.label }}</span>ブラケット
        </span>
        <span v-if="nextBracketInfo" class="ml-2">
          / 次({{ nextBracketInfo.nextRate }})まで:
          <span class="font-mono text-foreground">{{ fmt.format(nextBracketInfo.remaining) }}円</span>
        </span>
      </div>

      <!-- Expandable detail -->
      <Accordion type="single" collapsible class="w-full">
        <AccordionItem value="detail" class="border-none">
          <AccordionTrigger class="py-1 text-[10px] text-muted-foreground">
            詳細を見る
          </AccordionTrigger>
          <AccordionContent>
            <div class="space-y-1.5 pt-1">
              <div
                v-for="b in brackets"
                :key="b.label"
                class="flex items-center gap-2"
              >
                <span :class="b.color" class="inline-block h-3 rounded-sm" :style="{ width: `${Math.max(b.width, 5)}%` }" />
                <span class="flex-1 text-[10px] text-muted-foreground">
                  {{ b.label }}
                  ({{ fmt.format(b.min) }}~{{ b.max >= 50_000_000 ? '...' : fmt.format(b.max) }}円)
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </CardContent>
  </Card>
</template>
