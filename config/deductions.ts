/**
 * 控除定義
 *
 * Layer 1 (auto): 自動計算される控除 - 常に表示
 * Layer 2 (toggle): ユーザーがトグルで有効化する控除
 * Layer 3 (collapsed): 折りたたみ内の詳細控除
 */

export interface DeductionDefinition {
  id: string
  name: string
  /** Progressive disclosure layer: 1=自動, 2=トグル, 3=折りたたみ */
  layer: 1 | 2 | 3
  hasToggle: boolean
  /** デフォルト金額 (円)。null = 自動計算 or ユーザー入力 */
  defaultAmount: number | null
  /** 所得税の控除額 (円)。固定額の場合のみ */
  incomeTaxAmount?: number
  /** 住民税の控除額 (円)。固定額の場合のみ */
  residentTaxAmount?: number
  description: string
}

export const deductionDefinitions: DeductionDefinition[] = [
  // =========================================================================
  // Layer 1: 自動計算（常に表示）
  // =========================================================================
  {
    id: 'basic',
    name: '基礎控除',
    layer: 1,
    hasToggle: false,
    defaultAmount: null,
    description: '合計所得金額に応じて自動決定。令和7年改正で大幅引き上げ。',
  },
  {
    id: 'employment',
    name: '給与所得控除',
    layer: 1,
    hasToggle: false,
    defaultAmount: null,
    description: '給与収入から自動計算。令和7年改正で最低保障額65万円に引き上げ。',
  },
  {
    id: 'socialInsurance',
    name: '社会保険料控除',
    layer: 1,
    hasToggle: false,
    defaultAmount: null,
    description: '支払った社会保険料の全額が控除対象。',
  },

  // =========================================================================
  // Layer 2: トグルで有効化
  // =========================================================================
  {
    id: 'spouse',
    name: '配偶者控除',
    layer: 2,
    hasToggle: true,
    defaultAmount: null,
    description: '配偶者の合計所得金額58万円以下で適用。本人所得1,000万円超は不可。',
  },
  {
    id: 'dependent',
    name: '扶養控除',
    layer: 2,
    hasToggle: true,
    defaultAmount: null,
    description: '16歳以上の扶養親族がいる場合に適用。種類により控除額が異なる。',
  },
  {
    id: 'smallBusiness',
    name: '小規模企業共済等掛金控除',
    layer: 2,
    hasToggle: true,
    defaultAmount: 840_000,
    description: '小規模企業共済の掛金。上限: 年84万円 (月7万円)。全額所得控除。',
  },
  {
    id: 'ideco',
    name: 'iDeCo (個人型確定拠出年金)',
    layer: 2,
    hasToggle: true,
    defaultAmount: 276_000,
    description: 'iDeCoの掛金。企業年金なしの役員: 上限年27.6万円 (月2.3万円)。',
  },

  // =========================================================================
  // Layer 3: 折りたたみ内の詳細控除
  // =========================================================================
  {
    id: 'lifeInsurance',
    name: '生命保険料控除',
    layer: 3,
    hasToggle: true,
    defaultAmount: null,
    incomeTaxAmount: 120_000,
    residentTaxAmount: 70_000,
    description: '所得税: 最大12万円 (新制度3区分各4万円)。住民税: 最大7万円。',
  },
  {
    id: 'medical',
    name: '医療費控除',
    layer: 3,
    hasToggle: true,
    defaultAmount: null,
    description: '医療費 - 保険金等 - 10万円 (上限200万円)。確定申告が必要。',
  },
  {
    id: 'other',
    name: 'その他の控除',
    layer: 3,
    hasToggle: true,
    defaultAmount: null,
    description: '寄附金控除、障害者控除、寡婦控除、ひとり親控除など。',
  },
]

/** Layer別に控除定義を取得 */
export function getDeductionsByLayer(layer: 1 | 2 | 3): DeductionDefinition[] {
  return deductionDefinitions.filter(d => d.layer === layer)
}

/** IDで控除定義を取得 */
export function getDeductionById(id: string): DeductionDefinition | undefined {
  return deductionDefinitions.find(d => d.id === id)
}
