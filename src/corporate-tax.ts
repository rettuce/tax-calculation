/**
 * 法人税等計算ロジック
 *
 * 対象: 一人法人（資本金1億円以下の中小法人）、東京都特別区（23区）所在
 * 適用: 令和元年10月1日以後開始事業年度（令和7年度時点の最新税率）
 *
 * 公式ソース:
 * - 国税庁 No.5759 法人税の税率: https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5759.htm
 * - 国税庁 地方法人税の税率: https://www.nta.go.jp/publication/pamph/hojin/chihou_hojin/01.htm
 * - 東京都主税局 法人事業税・法人都民税: https://www.tax.metro.tokyo.lg.jp/kazei/work/houjinji
 * - 東京都主税局 特別法人事業税: https://www.tax.metro.tokyo.lg.jp/kazei/work/tokubetsu_houjin
 * - 東京都主税局 税率表PDF: https://www.tax.metro.tokyo.lg.jp/documents/d/tax/zeiritsuhyo
 * - 国税庁 令和7年度法人税改正: https://www.nta.go.jp/publication/pamph/hojin/kaisei_gaiyo2025/01.htm
 */

// =============================================================================
// 1. 型定義
// =============================================================================

/** 法人の基本情報 */
export interface CorporateProfile {
  /** 資本金の額（円） */
  capitalAmount: number;
  /** 従業者数 */
  numberOfEmployees: number;
  /** 事業年度の月数（通常12） */
  fiscalYearMonths: number;
  /** 東京都特別区のみに事務所を有するか */
  onlyInSpecialWard: boolean;
  /**
   * 適用除外事業者か（過去3年平均所得が15億円超）
   * 一人法人では通常 false
   */
  isExcludedLargeCorporation: boolean;
  /**
   * 大法人の完全支配関係があるか
   * 一人法人では通常 false
   */
  isSubsidiaryOfLargeCorporation: boolean;
}

/** 法人税率の設定 */
export interface CorporateTaxRates {
  /** 年800万円以下の部分の税率 */
  reducedRate: number;
  /** 年800万円超の部分の税率 */
  standardRate: number;
  /** 軽減税率が適用される所得上限（円） */
  reducedRateThreshold: number;
}

/** 地方法人税の設定 */
export interface LocalCorporateTaxConfig {
  /** 法人税額に対する税率 */
  rate: number;
}

/** 法人住民税（法人都民税）の設定 */
export interface CorporateInhabitantTaxConfig {
  /** 法人税割の税率（標準税率） */
  standardTaxRate: number;
  /** 法人税割の税率（超過税率） */
  excessTaxRate: number;
  /** 均等割額（年額・円） */
  flatRateAmount: number;
}

/** 法人事業税の所得割税率（3段階） */
export interface BusinessTaxRates {
  /** 年400万円以下の部分 */
  bracket1Rate: number;
  /** 年400万円超〜800万円以下の部分 */
  bracket2Rate: number;
  /** 年800万円超の部分 */
  bracket3Rate: number;
  /** 第1段階の上限（円） */
  bracket1Threshold: number;
  /** 第2段階の上限（円） */
  bracket2Threshold: number;
}

/** 特別法人事業税の設定 */
export interface SpecialBusinessTaxConfig {
  /** 基準法人所得割額に対する税率 */
  rate: number;
}

/** 防衛特別法人税の設定（令和8年4月1日以後開始事業年度から適用） */
export interface DefenseSpecialTaxConfig {
  /** 税率 */
  rate: number;
  /** 基礎控除額（年額・円） */
  basicDeduction: number;
  /** 適用開始: 令和8年4月1日以後開始事業年度 */
  effectiveFrom: string;
}

/** 税額の計算結果 */
export interface TaxCalculationResult {
  /** 課税所得金額（円） */
  taxableIncome: number;
  /** 法人税額（円） */
  corporateTax: number;
  /** 地方法人税額（円） */
  localCorporateTax: number;
  /** 法人住民税 法人税割（円） */
  inhabitantTaxOnCorporateTax: number;
  /** 法人住民税 均等割（円） */
  inhabitantFlatRate: number;
  /** 法人事業税 所得割（円） */
  businessTax: number;
  /** 特別法人事業税（円） */
  specialBusinessTax: number;
  /** 法人税等合計（円） */
  totalTax: number;
  /** 実効税率（均等割除く） */
  effectiveTaxRate: number;
  /** 表面税率（均等割除く） */
  nominalTaxRate: number;
  /** 内訳詳細 */
  breakdown: TaxBreakdown;
}

/** 法人税額の内訳 */
export interface TaxBreakdown {
  /** 法人税: 800万円以下部分 */
  corporateTaxReduced: number;
  /** 法人税: 800万円超部分 */
  corporateTaxStandard: number;
  /** 事業税: 400万以下部分 */
  businessTaxBracket1: number;
  /** 事業税: 400万超〜800万以下部分 */
  businessTaxBracket2: number;
  /** 事業税: 800万超部分 */
  businessTaxBracket3: number;
  /** 基準法人所得割額（標準税率で計算） */
  baseBusinessTaxForSpecial: number;
}

// =============================================================================
// 2. 税率設定値（令和元年10月1日以後〜令和7年3月31日までに開始する事業年度）
// =============================================================================

/**
 * 法人税率
 *
 * ソース: 国税庁 No.5759
 * https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5759.htm
 *
 * - 中小法人（資本金1億円以下）の年800万円以下の部分: 15%（時限特例）
 *   ※ 本則は19%。適用除外事業者（過去3年平均所得15億円超）は19%
 * - 年800万円超の部分: 23.2%
 *
 * 【令和7年4月1日以後の改正】
 * - 15%の軽減税率は延長（令和9年3月31日までに開始する事業年度）
 * - ただし、所得年10億円超の事業年度は800万以下部分が17%に引き上げ
 *   → 一人法人で年10億円超は通常あり得ないため、15%を適用
 */
export const CORPORATE_TAX_RATES: CorporateTaxRates = {
  reducedRate: 0.15,
  standardRate: 0.232,
  reducedRateThreshold: 8_000_000,
};

/**
 * 適用除外事業者向け法人税率（年800万円以下部分）
 * 過去3年平均所得が15億円超の法人に適用
 */
export const EXCLUDED_CORPORATION_REDUCED_RATE = 0.19;

/**
 * 地方法人税
 *
 * ソース: 国税庁
 * https://www.nta.go.jp/publication/pamph/hojin/chihou_hojin/01.htm
 *
 * 令和元年10月1日以後開始の課税事業年度から適用
 * 課税標準法人税額 x 10.3%
 *
 * 課税標準法人税額 = 各事業年度の所得に対する法人税の額（基準法人税額）
 */
export const LOCAL_CORPORATE_TAX: LocalCorporateTaxConfig = {
  rate: 0.103,
};

/**
 * 法人住民税（法人都民税）- 東京都特別区
 *
 * ソース: 東京都主税局
 * https://www.tax.metro.tokyo.lg.jp/kazei/work/houjinji
 *
 * 【法人税割】
 * 東京23区は都が市町村分も含めて一括課税（都の特例）
 * - 標準税率: 7.0%（道府県分1.0% + 市町村分6.0%）
 * - 超過税率: 10.4%（道府県分2.0% + 市町村分8.4%）
 *
 * 不均一課税（標準税率）の適用条件:
 *   資本金1億円以下 かつ 法人税額が年1,000万円以下
 *   → 一人法人は通常この条件を満たすため、標準税率7.0%を適用
 *
 * 【均等割】
 * 資本金等の額と従業者数で決定。赤字でも課税される。
 * 東京23区のみに事務所を有する法人の場合:
 *
 * | 資本金等の額       | 従業者50人以下 | 従業者50人超 |
 * |-------------------|-------------|------------|
 * | 1,000万円以下      | 70,000円    | 140,000円   |
 * | 1,000万超〜1億以下  | 180,000円   | 200,000円   |
 * | 1億超〜10億以下     | 290,000円   | 530,000円   |
 * | 10億超〜50億以下    | 950,000円   | 2,290,000円 |
 * | 50億超            | 1,210,000円  | 3,800,000円 |
 */
export const INHABITANT_TAX_STANDARD: CorporateInhabitantTaxConfig = {
  standardTaxRate: 0.07,
  excessTaxRate: 0.104,
  flatRateAmount: 70_000, // 資本金1,000万以下・従業者50人以下の場合
};

/** 均等割額テーブル（東京23区のみに事務所を有する法人） */
export const FLAT_RATE_TABLE: Array<{
  capitalMax: number | null; // null = 上限なし
  employees50OrLess: number;
  employees50Over: number;
}> = [
  { capitalMax: 10_000_000, employees50OrLess: 70_000, employees50Over: 140_000 },
  { capitalMax: 100_000_000, employees50OrLess: 180_000, employees50Over: 200_000 },
  { capitalMax: 1_000_000_000, employees50OrLess: 290_000, employees50Over: 530_000 },
  { capitalMax: 5_000_000_000, employees50OrLess: 950_000, employees50Over: 2_290_000 },
  { capitalMax: null, employees50OrLess: 1_210_000, employees50Over: 3_800_000 },
];

/**
 * 法人事業税（所得割）- 東京都
 *
 * ソース: 東京都主税局 税率表
 * https://www.tax.metro.tokyo.lg.jp/documents/d/tax/zeiritsuhyo
 *
 * 令和元年10月1日以後開始事業年度:
 *
 * 【標準税率（不均一課税適用法人）】
 * 条件: 資本金1億円以下 かつ 年所得2,500万円以下
 * - 年400万円以下: 3.5%
 * - 年400万超〜800万以下: 5.3%
 * - 年800万超: 7.0%
 *
 * 【超過税率】
 * 条件: 資本金1億円超 または 年所得2,500万円超
 * - 年400万円以下: 3.75%
 * - 年400万超〜800万以下: 5.665%
 * - 年800万超: 7.48%
 *
 * 外形標準課税: 資本金1億円超の法人が対象 → 中小法人は対象外
 */
export const BUSINESS_TAX_STANDARD: BusinessTaxRates = {
  bracket1Rate: 0.035,
  bracket2Rate: 0.053,
  bracket3Rate: 0.07,
  bracket1Threshold: 4_000_000,
  bracket2Threshold: 8_000_000,
};

export const BUSINESS_TAX_EXCESS: BusinessTaxRates = {
  bracket1Rate: 0.0375,
  bracket2Rate: 0.05665,
  bracket3Rate: 0.0748,
  bracket1Threshold: 4_000_000,
  bracket2Threshold: 8_000_000,
};

/**
 * 特別法人事業税
 *
 * ソース: 東京都主税局
 * https://www.tax.metro.tokyo.lg.jp/kazei/work/tokubetsu_houjin
 *
 * 資本金1億円以下の普通法人: 基準法人所得割額 x 37%
 *
 * 基準法人所得割額 = 標準税率により計算した法人事業税の所得割額
 * ※ 超過税率が適用される場合でも、特別法人事業税の計算には標準税率を使用
 */
export const SPECIAL_BUSINESS_TAX: SpecialBusinessTaxConfig = {
  rate: 0.37,
};

/**
 * 防衛特別法人税（参考）
 *
 * ソース: 国税庁 令和7年度法人税改正
 * https://www.nta.go.jp/publication/pamph/hojin/kaisei_gaiyo2025/01.htm
 *
 * 令和8年4月1日（2026年4月1日）以後開始事業年度から適用
 * （基準法人税額 - 500万円） x 4%
 *
 * 注意: 本計算ロジックには含めていない（令和7年度時点では未適用）
 */
export const DEFENSE_SPECIAL_TAX: DefenseSpecialTaxConfig = {
  rate: 0.04,
  basicDeduction: 5_000_000,
  effectiveFrom: '2026-04-01',
};

// =============================================================================
// 3. 不均一課税・超過税率の判定条件
// =============================================================================

/**
 * 法人事業税の不均一課税（標準税率）適用条件
 *
 * ソース: 東京都主税局（東京都都税条例第33条等）
 * https://www.tax.metro.tokyo.lg.jp/documents/d/tax/judgment_flow
 *
 * 以下の両方を満たす普通法人に標準税率が適用される:
 * 1. 資本金の額又は出資金の額が1億円以下
 * 2. 年所得金額が2,500万円以下（年収入金額が2億円以下）
 *
 * ※ 事業年度が1年未満の場合は月割で基準額を按分
 */
export const BUSINESS_TAX_STANDARD_RATE_CONDITIONS = {
  maxCapital: 100_000_000,
  maxAnnualIncome: 25_000_000,
} as const;

/**
 * 法人都民税（法人税割）の不均一課税（標準税率）適用条件
 *
 * ソース: 東京都主税局（東京都都税条例第107条等）
 * https://www.tax.metro.tokyo.lg.jp/kazei/work/houjinji
 *
 * 以下の両方を満たす法人に標準税率が適用される:
 * 1. 資本金の額又は出資金の額が1億円以下
 * 2. 法人税額が年1,000万円以下
 *
 * ※ 事業年度が1年未満の場合は月割で基準額を按分
 */
export const INHABITANT_TAX_STANDARD_RATE_CONDITIONS = {
  maxCapital: 100_000_000,
  maxCorporateTax: 10_000_000,
} as const;

// =============================================================================
// 4. 計算ロジック
// =============================================================================

/**
 * 均等割額を決定する
 */
function determineInhabitantFlatRate(
  capitalAmount: number,
  numberOfEmployees: number,
  fiscalYearMonths: number,
): number {
  const row = FLAT_RATE_TABLE.find(
    (r) => r.capitalMax === null || capitalAmount <= r.capitalMax,
  );
  if (!row) {
    throw new Error(`均等割テーブルに該当する区分が見つかりません: 資本金=${capitalAmount}`);
  }

  const annualAmount =
    numberOfEmployees <= 50 ? row.employees50OrLess : row.employees50Over;

  // 事業年度が1年未満の場合は月割
  if (fiscalYearMonths < 12) {
    return Math.floor((annualAmount * fiscalYearMonths) / 12);
  }
  return annualAmount;
}

/**
 * 法人事業税に標準税率を適用するか判定する
 */
function shouldApplyStandardBusinessTaxRate(
  capitalAmount: number,
  taxableIncome: number,
  fiscalYearMonths: number,
): boolean {
  if (capitalAmount > BUSINESS_TAX_STANDARD_RATE_CONDITIONS.maxCapital) {
    return false;
  }
  // 事業年度が1年未満の場合の所得基準は月割
  const incomeThreshold =
    fiscalYearMonths < 12
      ? Math.floor(
          (BUSINESS_TAX_STANDARD_RATE_CONDITIONS.maxAnnualIncome * fiscalYearMonths) / 12,
        )
      : BUSINESS_TAX_STANDARD_RATE_CONDITIONS.maxAnnualIncome;

  return taxableIncome <= incomeThreshold;
}

/**
 * 法人都民税法人税割に標準税率を適用するか判定する
 */
function shouldApplyStandardInhabitantTaxRate(
  capitalAmount: number,
  corporateTaxAmount: number,
  fiscalYearMonths: number,
): boolean {
  if (capitalAmount > INHABITANT_TAX_STANDARD_RATE_CONDITIONS.maxCapital) {
    return false;
  }
  const taxThreshold =
    fiscalYearMonths < 12
      ? Math.floor(
          (INHABITANT_TAX_STANDARD_RATE_CONDITIONS.maxCorporateTax * fiscalYearMonths) / 12,
        )
      : INHABITANT_TAX_STANDARD_RATE_CONDITIONS.maxCorporateTax;

  return corporateTaxAmount <= taxThreshold;
}

/**
 * 法人事業税（所得割）を計算する
 */
function calculateBusinessTax(
  taxableIncome: number,
  rates: BusinessTaxRates,
): { total: number; bracket1: number; bracket2: number; bracket3: number } {
  if (taxableIncome <= 0) {
    return { total: 0, bracket1: 0, bracket2: 0, bracket3: 0 };
  }

  const bracket1Income = Math.min(taxableIncome, rates.bracket1Threshold);
  const bracket2Income = Math.min(
    Math.max(taxableIncome - rates.bracket1Threshold, 0),
    rates.bracket2Threshold - rates.bracket1Threshold,
  );
  const bracket3Income = Math.max(taxableIncome - rates.bracket2Threshold, 0);

  const bracket1 = Math.floor(bracket1Income * rates.bracket1Rate);
  const bracket2 = Math.floor(bracket2Income * rates.bracket2Rate);
  const bracket3 = Math.floor(bracket3Income * rates.bracket3Rate);

  return {
    total: bracket1 + bracket2 + bracket3,
    bracket1,
    bracket2,
    bracket3,
  };
}

/**
 * 法人税等を一括計算する
 *
 * @param taxableIncome - 課税所得金額（円）。役員報酬・社会保険料会社負担分は既に損金算入済みの前提。
 * @param profile - 法人の基本情報
 * @returns 税額計算結果
 */
export function calculateCorporateTaxes(
  taxableIncome: number,
  profile: CorporateProfile,
): TaxCalculationResult {
  // --- 法人税 ---
  const reducedRate = profile.isExcludedLargeCorporation
    ? EXCLUDED_CORPORATION_REDUCED_RATE
    : CORPORATE_TAX_RATES.reducedRate;

  const incomeReduced = Math.min(
    Math.max(taxableIncome, 0),
    CORPORATE_TAX_RATES.reducedRateThreshold,
  );
  const incomeStandard = Math.max(
    taxableIncome - CORPORATE_TAX_RATES.reducedRateThreshold,
    0,
  );

  const corporateTaxReduced = Math.floor(incomeReduced * reducedRate);
  const corporateTaxStandard = Math.floor(incomeStandard * CORPORATE_TAX_RATES.standardRate);
  const corporateTax = corporateTaxReduced + corporateTaxStandard;

  // --- 地方法人税 ---
  // 課税標準法人税額（= 基準法人税額 = 法人税額）に10.3%
  const localCorporateTax = Math.floor(corporateTax * LOCAL_CORPORATE_TAX.rate);

  // --- 法人住民税（法人都民税）---
  // 法人税割
  const useStandardInhabitantRate = shouldApplyStandardInhabitantTaxRate(
    profile.capitalAmount,
    corporateTax,
    profile.fiscalYearMonths,
  );
  const inhabitantTaxRate = useStandardInhabitantRate
    ? INHABITANT_TAX_STANDARD.standardTaxRate
    : INHABITANT_TAX_STANDARD.excessTaxRate;
  const inhabitantTaxOnCorporateTax = Math.floor(corporateTax * inhabitantTaxRate);

  // 均等割（赤字でも課税）
  const inhabitantFlatRate = determineInhabitantFlatRate(
    profile.capitalAmount,
    profile.numberOfEmployees,
    profile.fiscalYearMonths,
  );

  // --- 法人事業税（所得割）---
  const useStandardBusinessRate = shouldApplyStandardBusinessTaxRate(
    profile.capitalAmount,
    taxableIncome,
    profile.fiscalYearMonths,
  );
  const businessTaxRates = useStandardBusinessRate
    ? BUSINESS_TAX_STANDARD
    : BUSINESS_TAX_EXCESS;
  const businessTaxResult = calculateBusinessTax(taxableIncome, businessTaxRates);

  // --- 特別法人事業税 ---
  // 基準法人所得割額 = 標準税率で計算した事業税の所得割額
  // ※ 超過税率適用法人でも、特別法人事業税の計算には標準税率を使用
  const baseBusinessTax = calculateBusinessTax(taxableIncome, BUSINESS_TAX_STANDARD);
  const specialBusinessTax = Math.floor(baseBusinessTax.total * SPECIAL_BUSINESS_TAX.rate);

  // --- 合計 ---
  const totalTax =
    corporateTax +
    localCorporateTax +
    inhabitantTaxOnCorporateTax +
    inhabitantFlatRate +
    businessTaxResult.total +
    specialBusinessTax;

  // --- 実効税率・表面税率の計算 ---
  // 均等割を除く（所得に比例しない固定額のため）
  const effectiveTaxRate =
    taxableIncome > 0 ? calculateEffectiveTaxRate(taxableIncome, profile) : 0;
  const nominalTaxRate =
    taxableIncome > 0 ? calculateNominalTaxRate(taxableIncome, profile) : 0;

  return {
    taxableIncome,
    corporateTax,
    localCorporateTax,
    inhabitantTaxOnCorporateTax,
    inhabitantFlatRate,
    businessTax: businessTaxResult.total,
    specialBusinessTax,
    totalTax,
    effectiveTaxRate,
    nominalTaxRate,
    breakdown: {
      corporateTaxReduced,
      corporateTaxStandard,
      businessTaxBracket1: businessTaxResult.bracket1,
      businessTaxBracket2: businessTaxResult.bracket2,
      businessTaxBracket3: businessTaxResult.bracket3,
      baseBusinessTaxForSpecial: baseBusinessTax.total,
    },
  };
}

// =============================================================================
// 5. 実効税率の計算
// =============================================================================

/**
 * 法定実効税率の計算式
 *
 * 法人事業税（+ 特別法人事業税）は翌年度の損金に算入されるため、
 * その減税効果を分母に反映させる。
 *
 * 実効税率 = (A + B + C) / (1 + D)
 *
 * A = 法人税率 x (1 + 地方法人税率 + 法人住民税法人税割率)
 * B = 法人事業税率（標準税率）
 * C = 法人事業税率（標準税率） x 特別法人事業税率
 * D = 法人事業税率（標準税率） + 法人事業税率（標準税率） x 特別法人事業税率
 *   = B + C
 *
 * ※ 事業税は翌年度の損金になる → 分母に (1 + 事業税率 + 特別法人事業税率) を置く
 * ※ 均等割は所得に比例しないため実効税率の計算から除外
 *
 * 注意: 所得が400万以下/400万超〜800万以下/800万超の3段階で事業税率が異なるため、
 *       厳密には加重平均の事業税率を使用する必要がある。
 *       以下の関数では、指定された所得金額に対する加重平均事業税率を用いて計算する。
 */
export function calculateEffectiveTaxRate(
  taxableIncome: number,
  profile: CorporateProfile,
): number {
  if (taxableIncome <= 0) return 0;

  // 法人税率の決定
  const reducedRate = profile.isExcludedLargeCorporation
    ? EXCLUDED_CORPORATION_REDUCED_RATE
    : CORPORATE_TAX_RATES.reducedRate;

  // 所得金額に応じた加重平均法人税率
  const incomeReduced = Math.min(taxableIncome, CORPORATE_TAX_RATES.reducedRateThreshold);
  const incomeStandard = Math.max(taxableIncome - CORPORATE_TAX_RATES.reducedRateThreshold, 0);
  const weightedCorporateTaxRate =
    (incomeReduced * reducedRate + incomeStandard * CORPORATE_TAX_RATES.standardRate) /
    taxableIncome;

  // 法人住民税法人税割率の決定
  const corporateTax = Math.floor(taxableIncome * weightedCorporateTaxRate);
  const useStandardInhabitantRate = shouldApplyStandardInhabitantTaxRate(
    profile.capitalAmount,
    corporateTax,
    profile.fiscalYearMonths,
  );
  const inhabitantTaxRate = useStandardInhabitantRate
    ? INHABITANT_TAX_STANDARD.standardTaxRate
    : INHABITANT_TAX_STANDARD.excessTaxRate;

  // 事業税率の決定（標準税率で計算 -- 特別法人事業税の基準となるため）
  const businessTaxResult = calculateBusinessTax(taxableIncome, BUSINESS_TAX_STANDARD);
  const weightedBusinessTaxRate = businessTaxResult.total / taxableIncome;

  // 実効税率の計算
  const localCorporateTaxRate = LOCAL_CORPORATE_TAX.rate;
  const specialBusinessTaxRate = SPECIAL_BUSINESS_TAX.rate;

  const numerator =
    weightedCorporateTaxRate * (1 + localCorporateTaxRate + inhabitantTaxRate) +
    weightedBusinessTaxRate * (1 + specialBusinessTaxRate);

  const denominator = 1 + weightedBusinessTaxRate * (1 + specialBusinessTaxRate);

  return numerator / denominator;
}

/**
 * 表面税率の計算
 *
 * 表面税率 = 法人税率 x (1 + 地方法人税率 + 住民税法人税割率) + 事業税率 + 特別法人事業税率
 *
 * ※ 事業税の損金算入効果を考慮しない
 */
export function calculateNominalTaxRate(
  taxableIncome: number,
  profile: CorporateProfile,
): number {
  if (taxableIncome <= 0) return 0;

  const reducedRate = profile.isExcludedLargeCorporation
    ? EXCLUDED_CORPORATION_REDUCED_RATE
    : CORPORATE_TAX_RATES.reducedRate;

  const incomeReduced = Math.min(taxableIncome, CORPORATE_TAX_RATES.reducedRateThreshold);
  const incomeStandard = Math.max(taxableIncome - CORPORATE_TAX_RATES.reducedRateThreshold, 0);
  const weightedCorporateTaxRate =
    (incomeReduced * reducedRate + incomeStandard * CORPORATE_TAX_RATES.standardRate) /
    taxableIncome;

  const corporateTax = Math.floor(taxableIncome * weightedCorporateTaxRate);
  const useStandardInhabitantRate = shouldApplyStandardInhabitantTaxRate(
    profile.capitalAmount,
    corporateTax,
    profile.fiscalYearMonths,
  );
  const inhabitantTaxRate = useStandardInhabitantRate
    ? INHABITANT_TAX_STANDARD.standardTaxRate
    : INHABITANT_TAX_STANDARD.excessTaxRate;

  const businessTaxResult = calculateBusinessTax(taxableIncome, BUSINESS_TAX_STANDARD);
  const weightedBusinessTaxRate = businessTaxResult.total / taxableIncome;

  const localCorporateTaxRate = LOCAL_CORPORATE_TAX.rate;
  const specialBusinessTaxRate = SPECIAL_BUSINESS_TAX.rate;

  return (
    weightedCorporateTaxRate * (1 + localCorporateTaxRate + inhabitantTaxRate) +
    weightedBusinessTaxRate * (1 + specialBusinessTaxRate)
  );
}

// =============================================================================
// 6. エッジケースと注意点
// =============================================================================

/**
 * エッジケースと注意点（ドキュメント）
 *
 * 1. 役員報酬:
 *    - 定期同額給与、事前確定届出給与等の要件を満たせば法人の損金（経費）として計上可能
 *    - 課税所得の計算前に既に控除されている前提
 *
 * 2. 社会保険料の会社負担分:
 *    - 法定福利費として全額損金算入可能
 *    - 健康保険料・厚生年金保険料の事業主負担分
 *
 * 3. 交際費の損金不算入:
 *    ソース: 国税庁 No.5265
 *    https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5265.htm
 *    - 中小法人（資本金1億円以下）: 年800万円まで全額損金算入可能
 *    - 飲食費の50%損金算入との選択適用
 *    - 1人あたり1万円以下の飲食費は交際費に該当しない
 *      （令和6年4月1日以後、5,000円→10,000円に引き上げ）
 *
 * 4. 赤字の場合:
 *    - 法人税、地方法人税、法人住民税法人税割、法人事業税、特別法人事業税 = 0
 *    - 法人住民税の均等割のみ発生（資本金1,000万以下・従業者50人以下で年7万円）
 *    - 青色申告の欠損金は10年間繰越控除可能
 *
 * 5. 法人事業税の損金算入:
 *    - 法人事業税は翌事業年度の損金に算入される
 *    - 実効税率の計算式で分母に事業税率を加算するのはこの効果を反映するため
 *    - 特別法人事業税も同様に損金算入される
 *
 * 6. 法人事業税の超過税率の適用:
 *    - 年所得が2,500万円を超えると超過税率が適用される
 *    - ただし特別法人事業税の計算には常に標準税率を使用する
 *
 * 7. 防衛特別法人税（令和8年4月1日以後開始事業年度から）:
 *    - (基準法人税額 - 500万円) x 4%
 *    - 一人法人の場合、法人税額が500万円以下なら課税なし
 *    - 法人税額500万円 ≒ 課税所得約3,333万円（15%税率の場合）
 */

// =============================================================================
// 7. 計算の具体例
// =============================================================================

/** 一人法人のデフォルトプロファイル */
export const DEFAULT_SOLO_CORP_PROFILE: CorporateProfile = {
  capitalAmount: 1_000_000, // 資本金100万円
  numberOfEmployees: 1,
  fiscalYearMonths: 12,
  onlyInSpecialWard: true,
  isExcludedLargeCorporation: false,
  isSubsidiaryOfLargeCorporation: false,
};

/**
 * 計算例を実行する
 */
export function runExamples(): void {
  const profile = DEFAULT_SOLO_CORP_PROFILE;

  console.log('================================================================');
  console.log('法人税等計算シミュレーション');
  console.log('前提: 一人法人、資本金100万円、東京都特別区、従業者1人');
  console.log('================================================================\n');

  const testCases = [
    { income: 0, label: '所得0円（赤字）' },
    { income: 5_000_000, label: '所得500万円' },
    { income: 10_000_000, label: '所得1,000万円' },
  ];

  for (const { income, label } of testCases) {
    const result = calculateCorporateTaxes(income, profile);
    printResult(label, result);
  }
}

function printResult(label: string, result: TaxCalculationResult): void {
  const fmt = (n: number) => n.toLocaleString('ja-JP');
  const pct = (n: number) => (n * 100).toFixed(2) + '%';

  console.log(`--- ${label} ---`);
  console.log(`課税所得:                    ${fmt(result.taxableIncome)}円`);
  console.log(`法人税:                      ${fmt(result.corporateTax)}円`);
  console.log(`  (800万以下: ${fmt(result.breakdown.corporateTaxReduced)}円, 800万超: ${fmt(result.breakdown.corporateTaxStandard)}円)`);
  console.log(`地方法人税:                  ${fmt(result.localCorporateTax)}円`);
  console.log(`法人住民税（法人税割）:       ${fmt(result.inhabitantTaxOnCorporateTax)}円`);
  console.log(`法人住民税（均等割）:         ${fmt(result.inhabitantFlatRate)}円`);
  console.log(`法人事業税（所得割）:         ${fmt(result.businessTax)}円`);
  console.log(`  (400万以下: ${fmt(result.breakdown.businessTaxBracket1)}円, 400万-800万: ${fmt(result.breakdown.businessTaxBracket2)}円, 800万超: ${fmt(result.breakdown.businessTaxBracket3)}円)`);
  console.log(`特別法人事業税:              ${fmt(result.specialBusinessTax)}円`);
  console.log(`  (基準法人所得割額: ${fmt(result.breakdown.baseBusinessTaxForSpecial)}円)`);
  console.log(`--------------------------------------`);
  console.log(`法人税等合計:                ${fmt(result.totalTax)}円`);
  if (result.taxableIncome > 0) {
    console.log(`実効税率（均等割除く）:       ${pct(result.effectiveTaxRate)}`);
    console.log(`表面税率（均等割除く）:       ${pct(result.nominalTaxRate)}`);
    console.log(`税負担率（均等割含む）:       ${pct(result.totalTax / result.taxableIncome)}`);
  }
  console.log('');
}

// エントリーポイント
if (typeof require !== 'undefined' && require.main === module) {
  runExamples();
}
