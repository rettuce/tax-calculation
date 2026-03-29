<script setup lang="ts">
import { provide } from 'vue'

const engine = useTaxEngine()
const scenario = useScenario()
provide('taxEngine', engine)
provide('scenario', scenario)
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b border-border px-4 py-3">
      <div class="container mx-auto flex items-center justify-between">
        <h1 class="text-lg font-bold">tedori</h1>
        <span class="text-xs text-muted-foreground">適用税率: 令和7年度</span>
      </div>
    </header>

    <main class="container mx-auto px-4 py-6 space-y-4">
      <!-- Row 1: 基本設定 -->
      <InputBasicSettings />

      <!-- Row 2: サマリー＋警告（常に全幅で見える） -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
        <ResultHeroNumber />
        <ResultWarningDisplay />
      </div>

      <!-- Row 3: 操作＋結果 3カラム -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="space-y-4">
          <InputCompensationSlider />
          <InputOptimizerGoal />
        </div>
        <div class="space-y-4">
          <ResultAllocationFlow />
          <ResultTaxBreakdown />
        </div>
        <div class="space-y-4">
          <ResultBracketBarCompact title="所得税ブラケット" type="income" />
          <ResultBracketBarCompact title="法人税ブラケット" type="corporate" />
          <ResultScenarioCompare />
        </div>
      </div>
    </main>

    <footer class="border-t border-border px-4 py-3">
      <div class="container mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>本シミュレーションは概算です。重要な判断の際は税理士にご相談ください。</p>
        <div class="flex items-center gap-3">
          <span>by <a href="https://github.com/rettuce" class="hover:text-foreground">rettuce</a></span>
          <a href="https://github.com/rettuce/tax-calculation" class="hover:text-foreground">GitHub</a>
        </div>
      </div>
    </footer>
  </div>
</template>
