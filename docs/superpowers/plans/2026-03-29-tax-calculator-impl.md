# 役員報酬最適化シミュレーター 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一人法人の役員報酬と法人利益の配分を視覚的にシミュレーションし、手取り・税負担の最適化を支援するWebアプリを構築する

**Architecture:** Nuxt 3 SSG + shadcn-vue ダークテーマ。計算ロジックはutils/(純粋関数)に分離し、composables/がVueリアクティビティを担当。config/に年度別税率データ。全計算クライアントサイド完結、CSPでデータ送信をブロック。

**Tech Stack:** Nuxt 3, Vue 3, shadcn-vue (Radix Vue), Tailwind CSS, Zod, Vitest, pnpm, Cloudflare Pages

**設計書:** `docs/superpowers/specs/2026-03-29-tax-calculator-design.md`
**参照実装:** `plan/tax-calculation-design.ts`, `plan/social-insurance-design.ts`, `src/corporate-tax.ts`

---

## File Map

### 新規作成

```
# プロジェクト基盤
nuxt.config.ts
tailwind.config.ts
app.vue
pages/index.vue
public/_headers

# 端数処理（全計算の基盤）
utils/rounding.ts
tests/utils/rounding.test.ts

# 税率設定データ
config/tax-rates/types.ts
config/tax-rates/2025.ts
config/tax-rates/index.ts
config/corporate-tax/types.ts
config/corporate-tax/2025.ts
config/corporate-tax/index.ts
config/social-insurance/types.ts
config/social-insurance/2025.ts
config/social-insurance/index.ts
config/deductions.ts
config/warnings.ts

# 計算ロジック（純粋関数）
utils/social-insurance-calculator.ts
utils/income-tax-calculator.ts
utils/resident-tax-calculator.ts
utils/corporate-tax-calculator.ts
utils/deduction-calculator.ts
utils/optimizer.ts
tests/utils/social-insurance-calculator.test.ts
tests/utils/income-tax-calculator.test.ts
tests/utils/resident-tax-calculator.test.ts
tests/utils/corporate-tax-calculator.test.ts
tests/utils/deduction-calculator.test.ts
tests/utils/optimizer.test.ts
tests/utils/integration.test.ts

# Vueリアクティビティ
composables/useTaxEngine.ts
composables/useScenario.ts

# UIコンポーネント
components/input/ProfitInput.vue
components/input/CompensationSlider.vue
components/input/BonusInput.vue
components/input/DeductionSelector.vue
components/input/ProfileSettings.vue
components/input/OptimizerGoal.vue
components/result/HeroNumber.vue
components/result/AllocationFlow.vue
components/result/TaxBreakdown.vue
components/result/BracketBarCompact.vue
components/result/BracketBarDetail.vue
components/result/WarningDisplay.vue
components/result/ScenarioCompare.vue
```

### 削除

```
src/corporate-tax.ts        # plan/に参照として残し、utils/に再実装
package-lock.json           # pnpmに移行
package.json                # Nuxt初期化で再生成
node_modules/               # pnpm再インストール
```

---

## Task 1: Nuxt 3 プロジェクト初期化

**Files:**
- Create: `nuxt.config.ts`, `app.vue`, `pages/index.vue`, `tailwind.config.ts`, `public/_headers`
- Delete: `package.json`, `package-lock.json`, `node_modules/`, `src/corporate-tax.ts`

- [ ] **Step 1: 既存ファイルの整理**

```bash
rm -rf node_modules package.json package-lock.json src/corporate-tax.ts
```

- [ ] **Step 2: Nuxt 3 プロジェクト初期化**

```bash
pnpx nuxi@latest init . --force --packageManager pnpm --gitInit false
```

- [ ] **Step 3: 依存パッケージ追加**

```bash
pnpm add zod
pnpm add -D vitest @vue/test-utils happy-dom @nuxt/test-utils
```

- [ ] **Step 4: shadcn-vue 初期化**

```bash
pnpx shadcn-vue@latest init
```

選択肢:
- Style: Default
- Base color: Zinc
- CSS variables: Yes
- Framework: Nuxt

- [ ] **Step 5: shadcn コンポーネント追加**

```bash
pnpx shadcn-vue@latest add slider accordion tabs card badge tooltip button input label select switch separator collapsible
```

- [ ] **Step 6: nuxt.config.ts を設定**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  ssr: false,
  telemetry: false,
  sourcemap: { client: false },
  modules: [
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
  ],
  shadcn: {
    prefix: '',
    componentDir: './components/ui',
  },
  app: {
    head: {
      title: '役員報酬最適化シミュレーター',
      meta: [
        { name: 'description', content: '一人法人の役員報酬と法人利益の配分を視覚的にシミュレーション' },
      ],
    },
  },
  nitro: {
    preset: 'cloudflare-pages',
  },
})
```

- [ ] **Step 7: Tailwind ダークテーマ設定**

`tailwind.config.ts` に `darkMode: 'class'` を追加（shadcn-vue initで生成済みの場合確認）。

- [ ] **Step 8: CSPヘッダー作成**

```
/* public/_headers */
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- [ ] **Step 9: app.vue にダークテーマ適用**

```vue
<!-- app.vue -->
<template>
  <div class="dark min-h-screen bg-background text-foreground">
    <NuxtPage />
  </div>
</template>
```

- [ ] **Step 10: pages/index.vue プレースホルダ**

```vue
<!-- pages/index.vue -->
<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold">役員報酬最適化シミュレーター</h1>
    <p class="text-muted-foreground mt-2">開発中</p>
  </div>
</template>
```

- [ ] **Step 11: vitest 設定**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
  },
  resolve: {
    alias: {
      '~': resolve(__dirname),
      '@': resolve(__dirname),
    },
  },
})
```

- [ ] **Step 12: dev サーバー起動確認**

```bash
pnpm dev
```

ブラウザで `http://localhost:3000` を開き、ダーク背景にタイトルが表示されることを確認。

- [ ] **Step 13: コミット**

```bash
git add -A
git commit -m "feat: Nuxt 3 + shadcn-vue + Tailwind ダークテーマ初期化"
```

---

## Task 2: 端数処理ユーティリティ

**Files:**
- Create: `utils/rounding.ts`, `tests/utils/rounding.test.ts`

- [ ] **Step 1: テスト作成**

```typescript
// tests/utils/rounding.test.ts
import { describe, test, expect } from 'vitest'
import {
  roundTaxableIncome,
  roundTaxAmount,
  roundInsurancePremium,
  roundStandardBonus,
  applyRate,
} from '~/utils/rounding'

describe('roundTaxableIncome', () => {
  test('1,000円未満切捨て', () => {
    expect(roundTaxableIncome(2_833_700)).toBe(2_833_000)
    expect(roundTaxableIncome(5_000_000)).toBe(5_000_000)
    expect(roundTaxableIncome(999)).toBe(0)
    expect(roundTaxableIncome(0)).toBe(0)
    expect(roundTaxableIncome(-100)).toBe(0)
  })
})

describe('roundTaxAmount', () => {
  test('100円未満切捨て', () => {
    expect(roundTaxAmount(189_701)).toBe(189_700)
    expect(roundTaxAmount(100)).toBe(100)
    expect(roundTaxAmount(99)).toBe(0)
  })
})

describe('roundInsurancePremium', () => {
  test('50銭以下切捨て', () => {
    expect(roundInsurancePremium(24775.0)).toBe(24775)
    expect(roundInsurancePremium(24775.5)).toBe(24775)
  })
  test('50銭超切上げ', () => {
    expect(roundInsurancePremium(24775.51)).toBe(24776)
    expect(roundInsurancePremium(24775.9)).toBe(24776)
  })
})

describe('roundStandardBonus', () => {
  test('1,000円未満切捨て', () => {
    expect(roundStandardBonus(2_345_678)).toBe(2_345_000)
    expect(roundStandardBonus(1_000_000)).toBe(1_000_000)
  })
})

describe('applyRate', () => {
  test('浮動小数点誤差を即座に丸める', () => {
    // 1,000,000 * 0.0991 = 99,099.99999... ではなく 99,100
    expect(applyRate(1_000_000, 0.0991, 'round')).toBe(99100)
    // 500,000 * 0.04955 = 24,775.0 → 24,775
    expect(applyRate(500_000, 0.04955, 'floor')).toBe(24775)
  })
})
```

- [ ] **Step 2: テスト実行して失敗を確認**

```bash
pnpm vitest run tests/utils/rounding.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: 実装**

```typescript
// utils/rounding.ts

/** 課税所得: 1,000円未満切捨て（所得税・法人税共通） */
export function roundTaxableIncome(n: number): number {
  if (n <= 0) return 0
  return Math.floor(n / 1_000) * 1_000
}

/** 税額: 100円未満切捨て */
export function roundTaxAmount(n: number): number {
  if (n <= 0) return 0
  return Math.floor(n / 100) * 100
}

/** 社保保険料: 50銭以下切捨て、50銭超切上げ */
export function roundInsurancePremium(n: number): number {
  const yen = Math.floor(n)
  const sen = n - yen
  return sen <= 0.5 ? yen : yen + 1
}

/** 標準賞与額: 1,000円未満切捨て */
export function roundStandardBonus(n: number): number {
  if (n <= 0) return 0
  return Math.floor(n / 1_000) * 1_000
}

/**
 * 料率適用: 乗算直後に即座に丸める（浮動小数点誤差対策）
 * IEEE 754の丸め誤差を考慮し、乗算結果を指定の丸めモードで処理する
 */
export function applyRate(
  base: number,
  rate: number,
  rounding: 'floor' | 'round' | 'insurance',
): number {
  const raw = base * rate
  switch (rounding) {
    case 'floor':
      return Math.floor(raw)
    case 'round':
      return Math.round(raw)
    case 'insurance':
      return roundInsurancePremium(raw)
  }
}
```

- [ ] **Step 4: テスト実行して通過を確認**

```bash
pnpm vitest run tests/utils/rounding.test.ts
```

Expected: ALL PASS

- [ ] **Step 5: コミット**

```bash
git add utils/rounding.ts tests/utils/rounding.test.ts
git commit -m "feat: 端数処理ユーティリティ（rounding.ts）"
```

---

## Task 3: 税率設定データ（config/）

**Files:**
- Create: `config/tax-rates/types.ts`, `config/tax-rates/2025.ts`, `config/tax-rates/index.ts`
- Create: `config/corporate-tax/types.ts`, `config/corporate-tax/2025.ts`, `config/corporate-tax/index.ts`
- Create: `config/social-insurance/types.ts`, `config/social-insurance/2025.ts`, `config/social-insurance/index.ts`
- Create: `config/deductions.ts`, `config/warnings.ts`

**参照:** `plan/tax-calculation-design.ts` (所得税・住民税テーブル), `plan/social-insurance-design.ts` (社保テーブル全50等級), `src/corporate-tax.ts` (法人税テーブル)

- [ ] **Step 1: 所得税・住民税の型定義**

```typescript
// config/tax-rates/types.ts
export interface IncomeTaxBracket {
  min: number
  max: number
  rate: number
  deduction: number
}

export interface EmploymentIncomeDeductionBracket {
  min: number
  max: number
  fixedAmount: number | null
  rate: number
  addition: number
}

export interface BasicDeductionBracket {
  maxIncome: number
  incomeTaxDeduction: number
  residentTaxDeduction: number
}

export interface TaxRateConfig {
  fiscalYear: string
  incomeTaxBrackets: IncomeTaxBracket[]
  reconstructionTaxRate: number
  employmentIncomeDeduction: EmploymentIncomeDeductionBracket[]
  basicDeduction: BasicDeductionBracket[]
  residentTaxRate: number
  residentTaxPerCapita: number
}
```

- [ ] **Step 2: 令和7年分所得税・住民税データ**

`plan/tax-calculation-design.ts` から以下の定数をそのまま移植:
- `INCOME_TAX_BRACKETS` (L43-51)
- `RECONSTRUCTION_TAX_RATE` (L60)
- `EMPLOYMENT_INCOME_DEDUCTION_R7` (L123-158)
- `BASIC_DEDUCTION_R7_R8` (L398-448)
- 住民税の定数 (L206-225)

ファイル: `config/tax-rates/2025.ts`。`satisfies TaxRateConfig` で型完全性を保証。

- [ ] **Step 3: 年度レジストリ**

```typescript
// config/tax-rates/index.ts
import type { TaxRateConfig } from './types'
import { taxRates2025 } from './2025'

export type FiscalYear = '2025'

const registry: Record<FiscalYear, TaxRateConfig> = {
  '2025': taxRates2025,
}

export function getTaxRates(year: FiscalYear): TaxRateConfig {
  return registry[year]
}

export { type TaxRateConfig } from './types'
```

- [ ] **Step 4: 法人税の型定義と令和7年度データ**

`src/corporate-tax.ts` から型定義と定数を移植:
- `CorporateTaxRates`, `BusinessTaxRates`, `CorporateInhabitantTaxConfig` 等の型
- `CORPORATE_TAX_RATES`, `BUSINESS_TAX_STANDARD`, `BUSINESS_TAX_EXCESS` 等の定数
- `FLAT_RATE_TABLE` (均等割テーブル)
- `BUSINESS_TAX_STANDARD_RATE_CONDITIONS`, `INHABITANT_TAX_STANDARD_RATE_CONDITIONS`

ファイル: `config/corporate-tax/types.ts`, `config/corporate-tax/2025.ts`, `config/corporate-tax/index.ts`

- [ ] **Step 5: 社会保険の型定義と令和7年度データ**

`plan/social-insurance-design.ts` から移植:
- 保険料率定数 (L46-87): 健保9.91%, 介護1.59%, 厚年18.3%, 拠出金0.36%
- `StandardRemunerationGrade` 型と全50等級テーブル `STANDARD_REMUNERATION_GRADES` (L107-135以降)
- 賞与上限定数: 健保573万/年, 厚年150万/回

ファイル: `config/social-insurance/types.ts`, `config/social-insurance/2025.ts`, `config/social-insurance/index.ts`

- [ ] **Step 6: 控除定義**

```typescript
// config/deductions.ts
export interface DeductionDefinition {
  id: string
  name: string
  layer: 1 | 2 | 3 // 段階的開示のレイヤー
  hasToggle: boolean
  defaultAmount: number | null // nullの場合は自動計算
  incomeTaxAmount?: number
  residentTaxAmount?: number
  description: string
}

export const DEDUCTION_DEFINITIONS: DeductionDefinition[] = [
  // Layer 1: 自動
  { id: 'basic', name: '基礎控除', layer: 1, hasToggle: false, defaultAmount: null, description: '所得に応じて自動計算' },
  { id: 'employment', name: '給与所得控除', layer: 1, hasToggle: false, defaultAmount: null, description: '給与収入から自動計算' },
  { id: 'socialInsurance', name: '社会保険料控除', layer: 1, hasToggle: false, defaultAmount: null, description: '社保個人負担分全額' },
  // Layer 2: よく使う
  { id: 'spouse', name: '配偶者控除', layer: 2, hasToggle: true, defaultAmount: null, incomeTaxAmount: 380_000, residentTaxAmount: 330_000, description: '配偶者の年収123万円以下' },
  { id: 'dependent', name: '扶養控除', layer: 2, hasToggle: true, defaultAmount: null, description: '人数・年齢区分を入力' },
  { id: 'smallBusiness', name: '小規模企業共済掛金', layer: 2, hasToggle: true, defaultAmount: 840_000, description: '月額最大7万円（年84万円）' },
  { id: 'ideco', name: 'iDeCo', layer: 2, hasToggle: true, defaultAmount: 276_000, description: '月額最大23,000円（年276,000円）' },
  // Layer 3: その他
  { id: 'lifeInsurance', name: '生命保険料控除', layer: 3, hasToggle: true, defaultAmount: 120_000, description: '新制度: 所得税最大12万/住民税最大7万' },
  { id: 'medical', name: '医療費控除', layer: 3, hasToggle: true, defaultAmount: 0, description: '(医療費-10万)、上限200万' },
  { id: 'other', name: 'その他控除', layer: 3, hasToggle: true, defaultAmount: 0, description: '合計額を入力' },
]
```

- [ ] **Step 7: 警告条件定義**

```typescript
// config/warnings.ts
export type WarningLevel = 'critical' | 'warning' | 'info'

export interface WarningDefinition {
  id: string
  level: WarningLevel
  condition: string // 条件の説明（実際の判定はuseTaxEngineで行う）
  message: string
}

export const WARNING_DEFINITIONS: WarningDefinition[] = [
  { id: 'deficit', level: 'critical', condition: '報酬+社保 > 利益', message: '法人が赤字になります' },
  { id: 'zeroSalary', level: 'warning', condition: '月額 = 0', message: '社会保険の加入資格を失う可能性があります' },
  { id: 'bonusOnly', level: 'warning', condition: '月額0+賞与のみ', message: '定期同額給与がない場合の実務リスクがあります' },
  { id: 'excessiveComp', level: 'warning', condition: '報酬 > 利益50%', message: '過大役員報酬と認定されるリスクがあります' },
  { id: 'tooLowComp', level: 'warning', condition: '報酬 < 利益10%', message: '極端に低い報酬は行為計算否認のリスクがあります' },
  { id: 'pensionCap', level: 'info', condition: '月額 > 65万', message: '厚生年金保険料は上限に達しています' },
  { id: 'bonusPensionCap', level: 'info', condition: '賞与 > 150万', message: '厚生年金の標準賞与額上限超過（年金受給額に影響）' },
  { id: 'bonusHealthCap', level: 'info', condition: '賞与 > 573万', message: '健康保険の標準賞与額年間上限超過' },
  { id: 'basicDeductionReduced', level: 'info', condition: '所得 > 2,400万', message: '基礎控除が減額されます' },
  { id: 'bonusFrequency', level: 'warning', condition: '支給回数 >= 4', message: '年4回以上は報酬として社保計算に含まれます' },
  { id: 'taxReturn', level: 'info', condition: '年収 > 2,000万', message: '確定申告が必要です。税理士への相談を推奨します' },
  { id: 'flatRateOnly', level: 'info', condition: '法人所得 <= 0', message: '赤字でも均等割70,000円は課税されます' },
  { id: 'pensionImpact', level: 'warning', condition: '社保最小化ゴール', message: '将来の年金受給額が減少します' },
  { id: 'loanRisk', level: 'info', condition: '法人留保 > 利益50%', message: '法人資金の個人使用は役員貸付金として課税されます' },
]
```

- [ ] **Step 8: コミット**

```bash
git add config/
git commit -m "feat: 税率設定データ（所得税・法人税・社保・控除・警告）"
```

---

## Task 4: 社会保険料計算

**Files:**
- Create: `utils/social-insurance-calculator.ts`, `tests/utils/social-insurance-calculator.test.ts`

- [ ] **Step 1: ゴールデンテスト作成**

数学検証ワーカーの計算例をベースに、ケース1（月50万/35歳/賞与なし）、ケース2（月80万/45歳/賞与200万）を検証。

```typescript
// tests/utils/social-insurance-calculator.test.ts
import { describe, test, expect } from 'vitest'
import {
  findStandardRemunerationGrade,
  calculateMonthlyPremiums,
  calculateBonusPremiums,
  calculateAnnualSocialInsurance,
} from '~/utils/social-insurance-calculator'
import type { SocialInsuranceResult } from '~/utils/social-insurance-calculator'

describe('findStandardRemunerationGrade', () => {
  test('月額500,000 → 健保30等級/厚年27等級', () => {
    const grade = findStandardRemunerationGrade(500_000)
    expect(grade.healthStandard).toBe(500_000)
    expect(grade.pensionStandard).toBe(500_000)
  })

  test('月額800,000 → 健保39等級(790,000)/厚年32等級(650,000)上限', () => {
    const grade = findStandardRemunerationGrade(800_000)
    expect(grade.healthStandard).toBe(790_000)
    expect(grade.pensionStandard).toBe(650_000)
  })

  test('月額1,500,000 → 健保50等級(1,390,000)/厚年32等級(650,000)', () => {
    const grade = findStandardRemunerationGrade(1_500_000)
    expect(grade.healthStandard).toBe(1_390_000)
    expect(grade.pensionStandard).toBe(650_000)
  })
})

describe('calculateAnnualSocialInsurance', () => {
  test('ケース1: 月50万/賞与0/35歳', () => {
    const result = calculateAnnualSocialInsurance({
      monthlyCompensation: 500_000,
      bonusAmount: 0,
      bonusCount: 1,
      age: 35,
      prefecture: 'tokyo',
    })
    expect(result.employeeAnnual).toBeCloseTo(846_300, -2) // 数百円の端数許容
    expect(result.employerAnnual).toBeCloseTo(867_900, -2)
  })

  test('ケース2: 月80万/賞与200万/45歳（介護保険あり）', () => {
    const result = calculateAnnualSocialInsurance({
      monthlyCompensation: 800_000,
      bonusAmount: 2_000_000,
      bonusCount: 1,
      age: 45,
      prefecture: 'tokyo',
    })
    expect(result.employeeAnnual).toBeCloseTo(1_511_038, -2)
    expect(result.employerAnnual).toBeCloseTo(1_544_542, -2)
  })

  test('ケース3: 賞与600万/年1回 → 健保上限573万適用', () => {
    const result = calculateAnnualSocialInsurance({
      monthlyCompensation: 300_000,
      bonusAmount: 6_000_000,
      bonusCount: 1,
      age: 40,
      prefecture: 'tokyo',
    })
    // 健保は573万上限、厚年は150万上限
    expect(result.employeeAnnual).toBeCloseTo(1_003_124, -2)
  })
})
```

- [ ] **Step 2: テスト失敗を確認**

```bash
pnpm vitest run tests/utils/social-insurance-calculator.test.ts
```

- [ ] **Step 3: 実装**

`plan/social-insurance-design.ts` の関数を移植・修正。主要な関数:
- `findStandardRemunerationGrade(monthlyRemuneration)`: 二分探索で等級を特定。健保と厚年で別のstandardMonthlyを返す
- `calculateMonthlyPremiums(grade, age, prefecture)`: 月額の保険料（個人・会社各分）を計算
- `calculateBonusPremiums(bonusAmount, bonusCount, age, prefecture, priorHealthCumulative)`: 賞与の保険料。各回で厚年150万上限を個別判定、健保は年度累計573万で判定
- `calculateAnnualSocialInsurance(input)`: 年額の統合関数

**重要:** 全計算で `applyRate` と `roundInsurancePremium` を使用する。

- [ ] **Step 4: テスト通過を確認**

```bash
pnpm vitest run tests/utils/social-insurance-calculator.test.ts
```

- [ ] **Step 5: コミット**

```bash
git add utils/social-insurance-calculator.ts tests/utils/social-insurance-calculator.test.ts
git commit -m "feat: 社会保険料計算（等級テーブル・賞与上限・介護保険）"
```

---

## Task 5: 所得税計算

**Files:**
- Create: `utils/income-tax-calculator.ts`, `tests/utils/income-tax-calculator.test.ts`

- [ ] **Step 1: ゴールデンテスト作成**

国税庁の計算例 + 数学検証ワーカーの結果を使用:

```typescript
// tests/utils/income-tax-calculator.test.ts
import { describe, test, expect } from 'vitest'
import {
  calculateEmploymentIncomeDeduction,
  calculateIncomeTax,
  calculateTotalIncomeTax,
} from '~/utils/income-tax-calculator'

describe('calculateEmploymentIncomeDeduction', () => {
  test('年収600万 → 控除164万', () => {
    expect(calculateEmploymentIncomeDeduction(6_000_000)).toBe(1_640_000)
  })
  test('年収1000万 → 控除195万（上限）', () => {
    expect(calculateEmploymentIncomeDeduction(10_000_000)).toBe(1_950_000)
  })
  test('年収150万 → 控除65万（最低保障, R7改正）', () => {
    expect(calculateEmploymentIncomeDeduction(1_500_000)).toBe(650_000)
  })
})

describe('calculateIncomeTax', () => {
  test('課税所得500万 → 所得税572,500', () => {
    expect(calculateIncomeTax(5_000_000)).toBe(572_500)
  })
  test('課税所得1000万 → 所得税1,764,000', () => {
    expect(calculateIncomeTax(10_000_000)).toBe(1_764_000)
  })
})

describe('calculateTotalIncomeTax', () => {
  test('課税所得500万 → 所得税+復興税 = 584,500（100円未満切捨て）', () => {
    // 572,500 + floor(572,500 * 0.021) = 572,500 + 12,022 = 584,522 → 584,500
    expect(calculateTotalIncomeTax(5_000_000)).toBe(584_500)
  })
})
```

- [ ] **Step 2: テスト失敗確認 → Step 3: 実装 → Step 4: テスト通過確認**

`plan/tax-calculation-design.ts` から移植。`calculateTotalIncomeTax` で合計に対して `roundTaxAmount` を適用する修正を含む。

- [ ] **Step 5: コミット**

```bash
git add utils/income-tax-calculator.ts tests/utils/income-tax-calculator.test.ts
git commit -m "feat: 所得税計算（累進課税・復興税・給与所得控除）"
```

---

## Task 6: 住民税計算

**Files:**
- Create: `utils/resident-tax-calculator.ts`, `tests/utils/resident-tax-calculator.test.ts`

- [ ] **Step 1: テスト作成**

所得税と住民税の課税所得の差（基礎控除額の違い）を検証するテストを含める。

- [ ] **Step 2-4: テスト失敗 → 実装 → 通過確認**

主要関数:
- `calculateResidentTaxableIncome(employmentIncome, deductions)`: 住民税用の課税所得
- `calculateAdjustmentDeduction(taxableIncome, totalIncome, personalDeductionDiff)`: 調整控除
- `calculateResidentTax(taxableIncome, adjustmentDeduction)`: 所得割 + 均等割

**住民税の生命保険料控除は所得税とは別テーブルで計算する**（plan/tax-calculation-design.tsのTODOを解消）。

- [ ] **Step 5: コミット**

```bash
git add utils/resident-tax-calculator.ts tests/utils/resident-tax-calculator.test.ts
git commit -m "feat: 住民税計算（調整控除・生命保険料控除の住民税用テーブル）"
```

---

## Task 7: 法人税等計算

**Files:**
- Create: `utils/corporate-tax-calculator.ts`, `tests/utils/corporate-tax-calculator.test.ts`

- [ ] **Step 1: テスト作成**

法人税ワーカーの計算例（所得0/500万/1000万）を使用。**端数処理を100円未満切捨てに修正**。

- [ ] **Step 2-4: テスト失敗 → 実装 → 通過確認**

`src/corporate-tax.ts` の `calculateCorporateTaxes` を移植し、以下を修正:
- 課税所得に `roundTaxableIncome` を適用
- 法人税額に `roundTaxAmount` を適用（Math.floorではなく）
- 地方法人税、法人住民税、法人事業税、特別法人事業税すべてに `roundTaxAmount` を適用

- [ ] **Step 5: コミット**

```bash
git add utils/corporate-tax-calculator.ts tests/utils/corporate-tax-calculator.test.ts
git commit -m "feat: 法人税等計算（端数処理修正・実効税率）"
```

---

## Task 8: 控除計算

**Files:**
- Create: `utils/deduction-calculator.ts`, `tests/utils/deduction-calculator.test.ts`

- [ ] **Step 1-5: テスト → 実装 → コミット**

主要関数:
- `getBasicDeduction(totalIncome, taxType: 'incomeTax' | 'residentTax')`: 基礎控除（6段階）
- `calculateSpouseDeduction(ownerIncome, spouseIncome, taxType)`: 配偶者控除/特別控除
- `calculateDependentDeduction(dependents, taxType)`: 扶養控除
- `calculateIncomeAdjustmentDeduction(grossIncome, hasYoungDependent)`: 所得金額調整控除
- `calculateLifeInsuranceDeduction(premiums, taxType)`: 生命保険料控除（所得税/住民税別テーブル）
- `calculateAllDeductions(input)`: 全控除の統合。所得税用/住民税用で別々の合計を返す

```bash
git commit -m "feat: 控除計算（基礎控除6段階・所得金額調整・生命保険料住民税テーブル）"
```

---

## Task 9: 最適化アルゴリズム

**Files:**
- Create: `utils/optimizer.ts`, `tests/utils/optimizer.test.ts`

- [ ] **Step 1: テスト作成**

```typescript
// tests/utils/optimizer.test.ts
import { describe, test, expect } from 'vitest'
import { optimize } from '~/utils/optimizer'
import type { OptimizationGoal } from '~/utils/optimizer'

describe('optimize', () => {
  test('手取り最大化: 利益2,000万/35歳', () => {
    const result = optimize({
      totalProfit: 20_000_000,
      age: 35,
      prefecture: 'tokyo',
      goal: 'maxNetIncome',
      deductions: {},
    })
    expect(result.monthlyCompensation).toBeGreaterThan(0)
    expect(result.totalNetIncome).toBeGreaterThan(0)
    // 不変条件: 手取り+留保+税+社保 = 利益
    const sum = result.personalNetIncome + result.corporateRetained
      + result.totalTax + result.totalSocialInsurance
    expect(sum).toBeCloseTo(20_000_000, -2)
  })

  test('最適化結果は手動計算の範囲内', () => {
    const result = optimize({
      totalProfit: 20_000_000,
      age: 35,
      prefecture: 'tokyo',
      goal: 'maxTotalRetained',
      deductions: {},
    })
    // ケース1（月50万）のトータル手残り1,393万より高いはず
    expect(result.totalNetIncome).toBeGreaterThan(13_900_000)
  })
})
```

- [ ] **Step 2-4: テスト → 実装 → 通過**

2段階探索:
- Phase 1: 月額1万刻み × 賞与10万刻み × 支給回数(1-3) → 上位5候補
- Phase 2: 上位候補の周辺 ±10万を1,000円刻みで精密探索

- [ ] **Step 5: コミット**

```bash
git commit -m "feat: 最適化アルゴリズム（2段階探索・4ゴール対応）"
```

---

## Task 10: 統合テスト（不変条件）

**Files:**
- Create: `tests/utils/integration.test.ts`

- [ ] **Step 1: プロパティベーステスト作成**

```typescript
// tests/utils/integration.test.ts
import { describe, test, expect } from 'vitest'
import { calculateAll } from '~/utils/optimizer'

describe('不変条件', () => {
  const testCases = [
    { profit: 10_000_000, monthly: 300_000, bonus: 0, age: 30 },
    { profit: 20_000_000, monthly: 500_000, bonus: 0, age: 35 },
    { profit: 20_000_000, monthly: 800_000, bonus: 2_000_000, age: 45 },
    { profit: 30_000_000, monthly: 300_000, bonus: 6_000_000, age: 40 },
    { profit: 50_000_000, monthly: 1_000_000, bonus: 5_000_000, age: 50 },
  ]

  test.each(testCases)(
    '個人手取り+法人留保+全税金+全社保=利益 (利益$profit/月$monthly)',
    ({ profit, monthly, bonus, age }) => {
      const result = calculateAll({
        totalProfit: profit,
        monthlyCompensation: monthly,
        bonusAmount: bonus,
        bonusCount: 1,
        age,
        prefecture: 'tokyo',
        deductions: {},
      })
      const sum = result.personalNetIncome + result.corporateRetained
        + result.totalPersonalTax + result.totalCorporateTax + result.totalSocialInsurance
      expect(Math.abs(sum - profit)).toBeLessThan(100) // 端数処理で最大数十円の差
    },
  )

  test('全金額が非負', () => {
    const result = calculateAll({
      totalProfit: 20_000_000,
      monthlyCompensation: 500_000,
      bonusAmount: 0,
      bonusCount: 1,
      age: 35,
      prefecture: 'tokyo',
      deductions: {},
    })
    expect(result.personalNetIncome).toBeGreaterThanOrEqual(0)
    expect(result.corporateRetained).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 2: テスト通過確認 → コミット**

```bash
git commit -m "test: 統合テスト（不変条件・5ケース検証）"
```

---

## Task 11: useTaxEngine composable

**Files:**
- Create: `composables/useTaxEngine.ts`

- [ ] **Step 1: 実装**

全入力を `ref` で管理し、計算結果を `computed` チェーンで導出する統合composable。utils/ の純粋関数を呼び出す。

```typescript
// composables/useTaxEngine.ts
import { ref, computed } from 'vue'
import { calculateAnnualSocialInsurance } from '~/utils/social-insurance-calculator'
import { calculateAll } from '~/utils/optimizer'
// ... 他のimport

export function useTaxEngine() {
  // 入力
  const totalProfit = ref(20_000_000)
  const monthlyCompensation = ref(500_000)
  const bonusAmount = ref(0)
  const bonusCount = ref<1 | 2 | 3>(1)
  const age = ref(35)
  const prefecture = ref('tokyo')
  const optimizationGoal = ref<'maxNetIncome' | 'maxTotalRetained' | 'minTaxRate' | 'minSocialInsurance'>('maxTotalRetained')
  const deductionSettings = ref<Record<string, { enabled: boolean; amount: number }>>({})

  // 計算結果（computedチェーン）
  const annualCompensation = computed(() =>
    monthlyCompensation.value * 12 + bonusAmount.value
  )

  const socialInsurance = computed(() =>
    calculateAnnualSocialInsurance({
      monthlyCompensation: monthlyCompensation.value,
      bonusAmount: bonusAmount.value,
      bonusCount: bonusCount.value,
      age: age.value,
      prefecture: prefecture.value,
    })
  )

  const result = computed(() =>
    calculateAll({
      totalProfit: totalProfit.value,
      monthlyCompensation: monthlyCompensation.value,
      bonusAmount: bonusAmount.value,
      bonusCount: bonusCount.value,
      age: age.value,
      prefecture: prefecture.value,
      deductions: deductionSettings.value,
    })
  )

  // 警告
  const warnings = computed(() => evaluateWarnings(result.value, /* ... */))

  // 最適化実行
  function runOptimization() { /* optimizerを呼び、結果でスライダーを更新 */ }

  return {
    // 入力
    totalProfit, monthlyCompensation, bonusAmount, bonusCount,
    age, prefecture, optimizationGoal, deductionSettings,
    // 計算結果
    annualCompensation, socialInsurance, result, warnings,
    // アクション
    runOptimization,
  }
}
```

- [ ] **Step 2: コミット**

```bash
git commit -m "feat: useTaxEngine composable（computedチェーン統合）"
```

---

## Task 12: useScenario composable

**Files:**
- Create: `composables/useScenario.ts`

- [ ] **Step 1: Zod スキーマ + localStorage実装**

```typescript
// composables/useScenario.ts
import { ref, watch } from 'vue'
import { z } from 'zod'

const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  createdAt: z.string(),
  totalProfit: z.number().min(0).max(1_000_000_000),
  monthlyCompensation: z.number().min(0).max(100_000_000),
  bonusAmount: z.number().min(0).max(100_000_000),
  bonusCount: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  age: z.number().min(18).max(100),
  prefecture: z.string(),
  deductions: z.record(z.object({ enabled: z.boolean(), amount: z.number() })),
})

export type Scenario = z.infer<typeof ScenarioSchema>

const STORAGE_KEY = 'tax-calc-scenarios'

export function useScenario() {
  const scenarios = ref<Scenario[]>(loadScenarios())

  function loadScenarios(): Scenario[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return z.array(ScenarioSchema).parse(parsed)
    } catch {
      return []
    }
  }

  function saveScenario(scenario: Omit<Scenario, 'id' | 'createdAt'>) { /* ... */ }
  function deleteScenario(id: string) { /* ... */ }
  function deleteAllScenarios() { /* ... */ }
  function exportScenarios(): string { return JSON.stringify(scenarios.value) }
  function importScenarios(json: string) { /* Zod検証付き */ }

  watch(scenarios, (val) => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

  return { scenarios, saveScenario, deleteScenario, deleteAllScenarios, exportScenarios, importScenarios }
}
```

- [ ] **Step 2: コミット**

```bash
git commit -m "feat: useScenario composable（localStorage + Zodバリデーション）"
```

---

## Task 13: UIコンポーネント — 入力パネル

**Files:**
- Create: `components/input/ProfitInput.vue`, `CompensationSlider.vue`, `BonusInput.vue`, `DeductionSelector.vue`, `ProfileSettings.vue`, `OptimizerGoal.vue`

- [ ] **Step 1-6: 各コンポーネント作成**

すべて `useTaxEngine()` から inject した値に双方向バインド。shadcn/ui の `Slider`, `Input`, `Switch`, `Select`, `Accordion`, `Collapsible` を使用。

主要コンポーネントの設計ポイント:
- **ProfitInput**: 万円単位のInput + 円表示のサブラベル。ヘルプツールチップ付き
- **CompensationSlider**: マスタースライダー（年間報酬総額）+ 制約バー（スタックドバー）。数値直接入力フィールド併設
- **BonusInput**: 金額Input + 支給回数Select(1-3回)
- **DeductionSelector**: 3層Accordion。Layer1は読み取り専用、Layer2はSwitchトグル、Layer3はCollapsible
- **ProfileSettings**: 年齢Input + 都道府県Select
- **OptimizerGoal**: 4つのRadioGroup + 「最適化実行」Button

- [ ] **Step 7: コミット**

```bash
git add components/input/
git commit -m "feat: 入力パネルUIコンポーネント"
```

---

## Task 14: UIコンポーネント — 結果パネル

**Files:**
- Create: `components/result/HeroNumber.vue`, `AllocationFlow.vue`, `TaxBreakdown.vue`, `BracketBarCompact.vue`, `BracketBarDetail.vue`, `WarningDisplay.vue`, `ScenarioCompare.vue`

- [ ] **Step 1-7: 各コンポーネント作成**

- **HeroNumber**: sticky表示。トータル手残り（大フォント）+ 個人/法人の内訳 + 差額アニメーション
- **AllocationFlow**: 利益→個人/法人のフロー型スタックドバー。各項目のバー長さが金額に比例
- **TaxBreakdown**: テーブルで全税額を一覧表示。個人税（所得税・住民税・社保個人）+ 法人税（法人税・地方法人税・住民税・事業税・特別法人事業税・均等割・社保会社）
- **BracketBarCompact**: 横1本バー。各ブラケットの色分け + 現在位置マーカー + 次のブラケットまでの余裕額
- **BracketBarDetail**: Accordion展開で縦バー + 各段階の説明テキスト
- **WarningDisplay**: 3レベル表示。Critical=バナー、Warning=バッジ、Info=ツールチップ
- **ScenarioCompare**: Tabs切替。保存済みシナリオのリスト + 差分テーブル

- [ ] **Step 8: コミット**

```bash
git add components/result/
git commit -m "feat: 結果パネルUIコンポーネント"
```

---

## Task 15: ページ統合

**Files:**
- Modify: `pages/index.vue`

- [ ] **Step 1: 2カラムレイアウト統合**

```vue
<!-- pages/index.vue -->
<script setup lang="ts">
const engine = useTaxEngine()
provide('taxEngine', engine)
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- ヘッダー -->
    <header class="border-b border-border px-4 py-3">
      <div class="container mx-auto flex items-center justify-between">
        <h1 class="text-lg font-bold">役員報酬最適化シミュレーター</h1>
        <span class="text-xs text-muted-foreground">適用税率: 令和7年度</span>
      </div>
    </header>

    <!-- メインコンテンツ: 2カラム -->
    <main class="container mx-auto px-4 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 左カラム: 入力 -->
        <div class="space-y-4">
          <ProfitInput />
          <ProfileSettings />
          <OptimizerGoal />
          <CompensationSlider />
          <BonusInput />
          <DeductionSelector />
        </div>

        <!-- 右カラム: 結果 -->
        <div class="space-y-4">
          <HeroNumber class="sticky top-4 z-10" />
          <WarningDisplay />
          <AllocationFlow />
          <TaxBreakdown />
          <BracketBarCompact title="所得税" type="income" />
          <BracketBarCompact title="法人税" type="corporate" />
          <ScenarioCompare />
        </div>
      </div>
    </main>

    <!-- フッター: 免責 -->
    <footer class="border-t border-border px-4 py-3 text-center">
      <p class="text-xs text-muted-foreground">
        本シミュレーションは概算です。重要な判断の際は税理士にご相談ください。
      </p>
    </footer>
  </div>
</template>
```

- [ ] **Step 2: ブラウザで動作確認**

```bash
pnpm dev
```

全コンポーネントが表示され、スライダー操作でリアルタイムに結果が更新されることを確認。

- [ ] **Step 3: コミット**

```bash
git commit -m "feat: ページ統合（2カラムレイアウト・レスポンシブ）"
```

---

## Task 16: GitHub リポジトリ作成 & cortex 登録

**Files:**
- Create: `~/cortex/projects/tax-calculation.md`

- [ ] **Step 1: GitHub プライベートリポジトリ作成**

```bash
gh repo create rettuce/tax-calculation --private --source=. --remote=origin --push
```

- [ ] **Step 2: cortex プロジェクト登録**

```markdown
<!-- ~/cortex/projects/tax-calculation.md -->
---
id: tax-calculation
title: "役員報酬最適化シミュレーター"
category: tool
stage: active
priority: medium
updated: 2026-03-29
last_session: 2026-03-29T03:00
---

## 概要
一人法人の役員報酬と法人利益の配分を視覚的にシミュレーション。
手取り・税負担の最適化を支援するWebアプリ。

## 技術スタック
Nuxt 3 + shadcn-vue + Tailwind CSS (ダーク) / Cloudflare Pages

## 現状
- 設計書v2完了（11ワーカーによる調査・検証・レビュー統合）
- 実装計画策定済み
- 計算ロジック実装開始

## リポジトリ
github.com/rettuce/tax-calculation (private)

## セッションログ
- [2026-03-29] 設計書作成、税率調査（5ワーカー）、レビュー（6ワーカー）、実装計画策定
```

- [ ] **Step 3: コミット & プッシュ**

```bash
git push -u origin main
```

---

## 並列実行の依存関係

```
Task 1 (プロジェクト初期化)
  ├→ Task 2 (端数処理)
  │    └→ Task 3 (税率設定データ)
  │         ├→ Task 4 (社保計算)     ─┐
  │         ├→ Task 5 (所得税計算)    │
  │         ├→ Task 6 (住民税計算)    ├→ Task 9 (最適化) → Task 10 (useTaxEngine) → Task 15 (統合)
  │         ├→ Task 7 (法人税計算)    │
  │         └→ Task 8 (控除計算)     ─┘
  │                                        Task 11 (useScenario) ─→ Task 15
  │                                        Task 13 (入力UI) ──────→ Task 15
  │                                        Task 14 (結果UI) ──────→ Task 15
  └→ Task 16 (GitHub & cortex) [いつでも実行可]
```

Task 4-8 は並列実行可能。Task 11, 13, 14 も Task 3 完了後に並列実行可能。
