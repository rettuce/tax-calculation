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
        <h1 class="text-lg font-bold">役員報酬最適化シミュレーター</h1>
        <span class="text-xs text-muted-foreground">適用税率: 令和7年度</span>
      </div>
    </header>

    <main class="container mx-auto px-4 py-6">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Left: Input panel -->
        <div class="space-y-4">
          <InputProfitInput />
          <InputProfileSettings />
          <InputOptimizerGoal />
          <InputCompensationSlider />
          <InputDeductionSelector />
        </div>

        <!-- Right: Results panel -->
        <div class="space-y-4">
          <ResultHeroNumber class="sticky top-4 z-10" />
          <ResultWarningDisplay />
          <ResultAllocationFlow />
          <ResultTaxBreakdown />
          <ResultBracketBarCompact title="所得税ブラケット" type="income" />
          <ResultBracketBarCompact title="法人税ブラケット" type="corporate" />
          <ResultScenarioCompare />
        </div>
      </div>
    </main>

    <footer class="border-t border-border px-4 py-3 text-center">
      <p class="text-xs text-muted-foreground">
        本シミュレーションは概算です。重要な判断の際は税理士にご相談ください。
      </p>
    </footer>
  </div>
</template>
