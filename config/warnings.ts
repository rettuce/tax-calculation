/**
 * 警告条件定義
 *
 * シミュレーション結果に対して表示する警告・注意・情報メッセージ
 */

export type WarningLevel = 'critical' | 'warning' | 'info'

export interface WarningDefinition {
  id: string
  level: WarningLevel
  /** 警告が発動する条件の説明 */
  condition: string
  /** ユーザーに表示するメッセージ */
  message: string
}

export const warningDefinitions: WarningDefinition[] = [
  {
    id: 'deficit',
    level: 'critical',
    condition: '法人の税引前利益がマイナス',
    message: '法人が赤字になります。役員報酬を下げるか、売上見込みを見直してください。',
  },
  {
    id: 'zeroSalary',
    level: 'critical',
    condition: '役員報酬が0円',
    message: '役員報酬0円では社会保険に加入できません。最低でも月額1万円程度の設定を検討してください。',
  },
  {
    id: 'bonusOnly',
    level: 'critical',
    condition: '月額報酬0円で賞与のみ',
    message: '月額報酬なしの賞与のみは税務上のリスクがあります。定期同額給与の設定が推奨されます。',
  },
  {
    id: 'excessiveComp',
    level: 'warning',
    condition: '役員報酬が売上の大部分を占める',
    message: '役員報酬が高すぎると「不相当に高額」として損金不算入になるリスクがあります。',
  },
  {
    id: 'tooLowComp',
    level: 'warning',
    condition: '役員報酬が極端に低い（月額5万円未満）',
    message: '報酬が低すぎると将来の年金受給額に影響します。社会保険の等級も確認してください。',
  },
  {
    id: 'pensionCap',
    level: 'info',
    condition: '厚生年金の標準報酬月額が上限（65万円）に到達',
    message: '月額報酬を増やしても厚生年金保険料は増えません。健康保険料のみ増加します。',
  },
  {
    id: 'bonusPensionCap',
    level: 'info',
    condition: '賞与の厚生年金標準賞与額が上限（150万円/回）に到達',
    message: '1回あたり150万円を超える賞与は、超過分に厚生年金保険料がかかりません。',
  },
  {
    id: 'bonusHealthCap',
    level: 'info',
    condition: '賞与の健康保険標準賞与額が年度累計上限（573万円）に到達',
    message: '年度累計573万円を超える賞与は、超過分に健康保険料がかかりません。',
  },
  {
    id: 'basicDeductionReduced',
    level: 'warning',
    condition: '合計所得金額が2,400万円超で基礎控除が減額される',
    message: '所得が高額のため基礎控除が段階的に減額されます。2,500万円超で控除額0円になります。',
  },
  {
    id: 'bonusFrequency',
    level: 'info',
    condition: '事前確定届出給与（賞与）が設定されている',
    message: '賞与は届出通りの金額・時期に支給しないと全額損金不算入になります。届出をお忘れなく。',
  },
  {
    id: 'taxReturn',
    level: 'info',
    condition: '年収2,000万円超、または医療費控除・寄附金控除等を適用する場合',
    message: '確定申告が必要です。年末調整だけでは対応できない控除項目があります。',
  },
  {
    id: 'flatRateOnly',
    level: 'info',
    condition: '法人所得がほぼゼロで均等割のみ発生',
    message: '法人所得がなくても均等割（年7万円）は必ず発生します。',
  },
  {
    id: 'pensionImpact',
    level: 'info',
    condition: '標準報酬月額の変更で将来の年金受給額が変動する',
    message: '役員報酬の変更は将来の厚生年金受給額に影響します。長期的な視点も考慮してください。',
  },
  {
    id: 'loanRisk',
    level: 'warning',
    condition: '役員報酬を大幅に下げた場合',
    message: '住宅ローン等の審査では個人の給与収入が重視されます。報酬の大幅な減額にはご注意ください。',
  },
]

/** レベル別に警告定義を取得 */
export function getWarningsByLevel(level: WarningLevel): WarningDefinition[] {
  return warningDefinitions.filter(w => w.level === level)
}

/** IDで警告定義を取得 */
export function getWarningById(id: string): WarningDefinition | undefined {
  return warningDefinitions.find(w => w.id === id)
}
