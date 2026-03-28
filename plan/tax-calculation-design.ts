/**
 * 役員報酬シミュレーター: 税額計算ロジック設計
 *
 * 対象: 令和7年分（2025年）所得税 / 令和8年度（2026年度）住民税
 *
 * 公式ソース:
 * - 国税庁 No.2260 所得税の税率 (令和7年4月1日現在法令等)
 * - 国税庁 No.1410 給与所得控除 (令和7年分以降)
 * - 国税庁 No.1199 基礎控除 (令和7年4月1日現在法令等)
 * - 国税庁 No.1191 配偶者控除 / No.1195 配偶者特別控除
 * - 国税庁 No.1180 扶養控除
 * - 国税庁 No.1140 生命保険料控除
 * - 国税庁 No.1120 医療費控除
 * - 国税庁 No.1135 小規模企業共済等掛金控除
 * - 東京都主税局 個人住民税
 * - 中央区・港区・板橋区 住民税計算ページ
 * - 静岡市 調整控除 人的控除差額一覧
 * - 総務省 個人住民税における定額減税について
 */

// =============================================================================
// 1. 所得税の累進課税
// =============================================================================

/**
 * 所得税速算表 (令和7年分)
 * 出典: 国税庁 No.2260 (令和7年4月1日現在法令等)
 *
 * 計算式: 課税所得金額 × 税率 - 控除額
 * ※ 課税所得金額は1,000円未満の端数切り捨て
 */
interface IncomeTaxBracket {
  /** 課税所得の下限 (円) */
  min: number;
  /** 課税所得の上限 (円, inclusive) */
  max: number;
  /** 税率 (小数) */
  rate: number;
  /** 控除額 (円) */
  deduction: number;
}

const INCOME_TAX_BRACKETS: IncomeTaxBracket[] = [
  { min: 1_000, max: 1_949_000, rate: 0.05, deduction: 0 },
  { min: 1_950_000, max: 3_299_000, rate: 0.10, deduction: 97_500 },
  { min: 3_300_000, max: 6_949_000, rate: 0.20, deduction: 427_500 },
  { min: 6_950_000, max: 8_999_000, rate: 0.23, deduction: 636_000 },
  { min: 9_000_000, max: 17_999_000, rate: 0.33, deduction: 1_536_000 },
  { min: 18_000_000, max: 39_999_000, rate: 0.40, deduction: 2_796_000 },
  { min: 40_000_000, max: Infinity, rate: 0.45, deduction: 4_796_000 },
];

/**
 * 復興特別所得税
 * 出典: 国税庁 復興特別所得税のあらまし
 * 期間: 2013年(平成25年) ~ 2037年(令和19年)
 * 税率: 所得税額 × 2.1%
 * ※ 令和7年度税制改正大綱で防衛増税との統合が検討されたが、令和7年分は変更なし
 */
const RECONSTRUCTION_TAX_RATE = 0.021;

/**
 * 所得税を計算する
 */
function calculateIncomeTax(taxableIncome: number): number {
  // 1,000円未満切り捨て
  const rounded = Math.floor(taxableIncome / 1000) * 1000;
  if (rounded <= 0) return 0;

  const bracket = INCOME_TAX_BRACKETS.find(
    (b) => rounded >= b.min && rounded <= b.max
  );
  if (!bracket) return 0;

  return rounded * bracket.rate - bracket.deduction;
}

/**
 * 復興特別所得税を含めた所得税の合計を計算する
 */
function calculateTotalIncomeTax(taxableIncome: number): number {
  const incomeTax = calculateIncomeTax(taxableIncome);
  const reconstructionTax = Math.floor(incomeTax * RECONSTRUCTION_TAX_RATE);
  return incomeTax + reconstructionTax;
}

/*
 * ---- 計算例 ----
 *
 * 例1: 課税所得 500万円の場合
 *   5,000,000 × 0.20 - 427,500 = 572,500円 (所得税)
 *   572,500 × 0.021 = 12,022円 (復興特別所得税)
 *   合計: 584,522円
 *
 * 例2: 課税所得 1,000万円の場合
 *   10,000,000 × 0.33 - 1,536,000 = 1,764,000円 (所得税)
 *   1,764,000 × 0.021 = 37,044円 (復興特別所得税)
 *   合計: 1,801,044円
 */

// =============================================================================
// 2. 給与所得控除
// =============================================================================

/**
 * 給与所得控除の計算式テーブル (令和7年分以降)
 * 出典: 国税庁 No.1410 (令和7年12月1日施行, 令和7年分から適用)
 *
 * 改正点: 最低保障額が55万円 → 65万円に引き上げ
 * 上限: 850万円超は一律195万円
 */
interface EmploymentIncomeDeductionBracket {
  min: number;
  max: number;
  /** 定額の場合の金額、またはnull */
  fixedAmount: number | null;
  /** 収入に掛ける割合 */
  rate: number;
  /** 加算額 */
  addition: number;
}

const EMPLOYMENT_INCOME_DEDUCTION_R7: EmploymentIncomeDeductionBracket[] = [
  // ~ 190万円: 65万円 (定額)
  { min: 0, max: 1_900_000, fixedAmount: 650_000, rate: 0, addition: 0 },
  // 190万超 ~ 360万円: 収入 × 30% + 8万円
  {
    min: 1_900_001,
    max: 3_600_000,
    fixedAmount: null,
    rate: 0.30,
    addition: 80_000,
  },
  // 360万超 ~ 660万円: 収入 × 20% + 44万円
  {
    min: 3_600_001,
    max: 6_600_000,
    fixedAmount: null,
    rate: 0.20,
    addition: 440_000,
  },
  // 660万超 ~ 850万円: 収入 × 10% + 110万円
  {
    min: 6_600_001,
    max: 8_500_000,
    fixedAmount: null,
    rate: 0.10,
    addition: 1_100_000,
  },
  // 850万超: 195万円 (上限・定額)
  {
    min: 8_500_001,
    max: Infinity,
    fixedAmount: 1_950_000,
    rate: 0,
    addition: 0,
  },
];

/**
 * 給与所得控除額を計算する
 */
function calculateEmploymentIncomeDeduction(grossIncome: number): number {
  if (grossIncome <= 0) return 0;

  const bracket = EMPLOYMENT_INCOME_DEDUCTION_R7.find(
    (b) => grossIncome >= b.min && grossIncome <= b.max
  );
  if (!bracket) return 0;

  if (bracket.fixedAmount !== null) {
    return bracket.fixedAmount;
  }
  return grossIncome * bracket.rate + bracket.addition;
}

/**
 * 給与所得を計算する (= 給与収入 - 給与所得控除)
 */
function calculateEmploymentIncome(grossIncome: number): number {
  return Math.max(0, grossIncome - calculateEmploymentIncomeDeduction(grossIncome));
}

/*
 * ---- 給与所得控除の具体例 ----
 *
 * 年収 600万円:  6,000,000 × 0.20 + 440,000 = 1,640,000円 → 給与所得 4,360,000円
 * 年収 1,000万円: 10,000,000 × 0.10 + 1,100,000 = 1,950,000円(上限到達) → 給与所得 8,050,000円
 *   ※ 実際には 850万超なので一律195万円
 * 年収 1,500万円: 一律 1,950,000円 → 給与所得 13,050,000円
 * 年収 2,000万円: 一律 1,950,000円 → 給与所得 18,050,000円
 */

// =============================================================================
// 3. 住民税
// =============================================================================

/**
 * 住民税 所得割
 * 出典: 東京都主税局 / 各特別区公式サイト
 *
 * 特別区民税: 6%
 * 都民税:     4%
 * 合計:      10% (全国一律、所得金額による変動なし)
 */
const RESIDENT_TAX_WARD_RATE = 0.06; // 特別区民税
const RESIDENT_TAX_METRO_RATE = 0.04; // 都民税
const RESIDENT_TAX_TOTAL_RATE = 0.10; // 合計

/**
 * 住民税 均等割
 * 出典: 各特別区公式サイト (令和6年度以降)
 *
 * 特別区民税均等割: 3,000円
 * 都民税均等割:     1,000円
 * 森林環境税(国税): 1,000円 ※令和6年度から
 * 合計:            5,000円
 */
const RESIDENT_TAX_PER_CAPITA_WARD = 3_000;
const RESIDENT_TAX_PER_CAPITA_METRO = 1_000;
const FOREST_ENVIRONMENT_TAX = 1_000; // 国税だが均等割と併せて徴収
const RESIDENT_TAX_PER_CAPITA_TOTAL =
  RESIDENT_TAX_PER_CAPITA_WARD +
  RESIDENT_TAX_PER_CAPITA_METRO +
  FOREST_ENVIRONMENT_TAX; // 5,000円

/**
 * 住民税の所得割を計算する
 *
 * 計算式:
 *   課税総所得金額 × 10% = 算出所得割額
 *   算出所得割額 - 調整控除 - 税額控除 = 所得割額
 *   ※ 100円未満の端数切り捨て
 */
function calculateResidentIncomeTax(
  taxableIncome: number,
  adjustmentDeduction: number,
  taxCredits: number = 0
): number {
  const calculatedTax = taxableIncome * RESIDENT_TAX_TOTAL_RATE;
  const result = calculatedTax - adjustmentDeduction - taxCredits;
  // 100円未満切り捨て
  return Math.max(0, Math.floor(result / 100) * 100);
}

// =============================================================================
// 3.1 調整控除
// =============================================================================

/**
 * 調整控除の計算方法
 * 出典: 港区・豊島区・板橋区 住民税計算ページ
 *
 * 目的: 所得税と住民税の人的控除額の差による負担増を調整
 *
 * 合計課税所得金額 200万円以下の場合:
 *   min(人的控除差額の合計, 合計課税所得金額) × 5%
 *
 * 合計課税所得金額 200万円超の場合:
 *   max(人的控除差額の合計 - (合計課税所得金額 - 200万円), 2,500円) × 5%
 *
 * ※ 合計所得金額が2,500万円超の場合は調整控除の適用なし
 *
 * 内訳: 特別区民税 3%, 都民税 2% (合計5%)
 */
function calculateAdjustmentDeduction(
  taxableIncome: number,
  totalIncomeAmount: number,
  personalDeductionDifference: number
): number {
  // 合計所得金額が2,500万円超は適用なし
  if (totalIncomeAmount > 25_000_000) return 0;

  let base: number;
  if (taxableIncome <= 2_000_000) {
    base = Math.min(personalDeductionDifference, taxableIncome);
  } else {
    base = Math.max(
      personalDeductionDifference - (taxableIncome - 2_000_000),
      2_500
    );
  }

  return base * 0.05;
}

/**
 * 人的控除額の差額一覧
 * 出典: 静岡市 個人市民税・県民税の税額控除の種類
 *
 * ※ 地方税法第37条・第314条の6に規定された額
 *   「必ずしも個人住民税と所得税の差額とは一致しません」(原文)
 */
interface PersonalDeductionDifference {
  type: string;
  subtype?: string;
  /** 人的控除差額 (円) */
  difference: number;
}

const PERSONAL_DEDUCTION_DIFFERENCES: PersonalDeductionDifference[] = [
  // 基礎控除
  { type: "basic", difference: 50_000 },

  // 配偶者控除 (一般)
  { type: "spouse", subtype: "general_income_900", difference: 50_000 },
  { type: "spouse", subtype: "general_income_950", difference: 40_000 },
  { type: "spouse", subtype: "general_income_1000", difference: 20_000 },

  // 配偶者控除 (老人)
  { type: "spouse", subtype: "elderly_income_900", difference: 100_000 },
  { type: "spouse", subtype: "elderly_income_950", difference: 60_000 },
  { type: "spouse", subtype: "elderly_income_1000", difference: 30_000 },

  // 配偶者特別控除 (配偶者所得48万超50万未満)
  {
    type: "spouseSpecial",
    subtype: "48to50_income_900",
    difference: 50_000,
  },
  {
    type: "spouseSpecial",
    subtype: "48to50_income_950",
    difference: 40_000,
  },
  {
    type: "spouseSpecial",
    subtype: "48to50_income_1000",
    difference: 20_000,
  },

  // 配偶者特別控除 (配偶者所得50万以上55万未満)
  {
    type: "spouseSpecial",
    subtype: "50to55_income_900",
    difference: 30_000,
  },
  {
    type: "spouseSpecial",
    subtype: "50to55_income_950",
    difference: 20_000,
  },
  {
    type: "spouseSpecial",
    subtype: "50to55_income_1000",
    difference: 10_000,
  },

  // 配偶者特別控除 (配偶者所得55万以上133万以下) → 差額なし
  // 扶養控除
  { type: "dependent", subtype: "general", difference: 50_000 },
  { type: "dependent", subtype: "specific", difference: 180_000 },
  { type: "dependent", subtype: "elderly", difference: 100_000 },
  { type: "dependent", subtype: "elderlyCoResident", difference: 130_000 },

  // 障害者控除
  { type: "disability", subtype: "general", difference: 10_000 },
  { type: "disability", subtype: "special", difference: 100_000 },
  { type: "disability", subtype: "specialCoResident", difference: 220_000 },

  // 寡婦控除
  { type: "widow", difference: 10_000 },

  // ひとり親控除
  { type: "singleParent", subtype: "mother", difference: 50_000 },
  { type: "singleParent", subtype: "father", difference: 10_000 },

  // 勤労学生控除
  { type: "workingStudent", difference: 10_000 },
];

// =============================================================================
// 4. 各種所得控除
// =============================================================================

// -----------------------------------------------------------------------------
// 4.1 基礎控除
// -----------------------------------------------------------------------------

/**
 * 所得税 基礎控除 (令和7年・令和8年分)
 * 出典: 国税庁 No.1199 (令和7年4月1日現在法令等)
 *
 * 令和7年度税制改正により大幅に引き上げ。
 * 合計所得655万円超～2,350万円以下の基本額 58万円 に対し、
 * 低所得者向けに段階的な特例加算が上乗せされる (令和7・8年分のみ)。
 *
 * ※ 令和9年分以降: 655万円以下は一律58万円 (特例加算なし)
 */
interface BasicDeductionBracket {
  maxIncome: number;
  /** 所得税の控除額 (円) */
  incomeTaxDeduction: number;
  /** 住民税の控除額 (円) */
  residentTaxDeduction: number;
}

const BASIC_DEDUCTION_R7_R8: BasicDeductionBracket[] = [
  // 合計所得132万円以下: 所得税95万円, 住民税43万円
  {
    maxIncome: 1_320_000,
    incomeTaxDeduction: 950_000,
    residentTaxDeduction: 430_000,
  },
  // 合計所得336万円以下: 所得税88万円, 住民税43万円
  {
    maxIncome: 3_360_000,
    incomeTaxDeduction: 880_000,
    residentTaxDeduction: 430_000,
  },
  // 合計所得489万円以下: 所得税68万円, 住民税43万円
  {
    maxIncome: 4_890_000,
    incomeTaxDeduction: 680_000,
    residentTaxDeduction: 430_000,
  },
  // 合計所得655万円以下: 所得税63万円, 住民税43万円
  {
    maxIncome: 6_550_000,
    incomeTaxDeduction: 630_000,
    residentTaxDeduction: 430_000,
  },
  // 合計所得2,350万円以下: 所得税58万円, 住民税43万円
  {
    maxIncome: 23_500_000,
    incomeTaxDeduction: 580_000,
    residentTaxDeduction: 430_000,
  },
  // 合計所得2,400万円以下: 所得税48万円, 住民税29万円
  {
    maxIncome: 24_000_000,
    incomeTaxDeduction: 480_000,
    residentTaxDeduction: 290_000,
  },
  // 合計所得2,450万円以下: 所得税32万円, 住民税15万円
  {
    maxIncome: 24_500_000,
    incomeTaxDeduction: 320_000,
    residentTaxDeduction: 150_000,
  },
  // 合計所得2,500万円以下: 所得税16万円, 住民税0円 (※要確認: 一部資料では住民税も適用)
  {
    maxIncome: 25_000_000,
    incomeTaxDeduction: 160_000,
    residentTaxDeduction: 0,
  },
  // 合計所得2,500万円超: 適用なし
];

/**
 * 基礎控除額を取得する
 */
function getBasicDeduction(
  totalIncome: number,
  taxType: "incomeTax" | "residentTax"
): number {
  if (totalIncome > 25_000_000) return 0;

  const bracket = BASIC_DEDUCTION_R7_R8.find((b) => totalIncome <= b.maxIncome);
  if (!bracket) return 0;

  return taxType === "incomeTax"
    ? bracket.incomeTaxDeduction
    : bracket.residentTaxDeduction;
}

// -----------------------------------------------------------------------------
// 4.2 配偶者控除
// -----------------------------------------------------------------------------

/**
 * 配偶者控除 (令和7年分以降)
 * 出典: 国税庁 No.1191 (令和7年4月1日現在法令等)
 *
 * 配偶者の合計所得金額: 58万円以下 (改正前: 48万円以下)
 *   → 給与収入のみなら123万円以下 (改正前: 103万円以下)
 *
 * 本人の合計所得金額が1,000万円超: 適用不可
 */
interface SpouseDeductionEntry {
  /** 本人の合計所得の上限 (円) */
  maxOwnerIncome: number;
  /** 一般配偶者の控除額 (所得税, 円) */
  incomeTaxGeneral: number;
  /** 老人配偶者の控除額 (所得税, 円) */
  incomeTaxElderly: number;
  /** 一般配偶者の控除額 (住民税, 円) */
  residentTaxGeneral: number;
  /** 老人配偶者の控除額 (住民税, 円) */
  residentTaxElderly: number;
}

const SPOUSE_DEDUCTION: SpouseDeductionEntry[] = [
  {
    maxOwnerIncome: 9_000_000,
    incomeTaxGeneral: 380_000,
    incomeTaxElderly: 480_000,
    residentTaxGeneral: 330_000,
    residentTaxElderly: 380_000,
  },
  {
    maxOwnerIncome: 9_500_000,
    incomeTaxGeneral: 260_000,
    incomeTaxElderly: 320_000,
    residentTaxGeneral: 220_000,
    residentTaxElderly: 260_000,
  },
  {
    maxOwnerIncome: 10_000_000,
    incomeTaxGeneral: 130_000,
    incomeTaxElderly: 160_000,
    residentTaxGeneral: 110_000,
    residentTaxElderly: 130_000,
  },
  // 1,000万円超: 適用不可
];

// -----------------------------------------------------------------------------
// 4.3 配偶者特別控除
// -----------------------------------------------------------------------------

/**
 * 配偶者特別控除 (令和7年分所得税 / 令和8年度住民税 以降)
 * 出典:
 *   所得税: 国税庁 No.1195 (令和7年4月1日現在法令等)
 *   住民税: 中央区 配偶者控除と配偶者特別控除 (令和8年度から)
 *
 * 配偶者の合計所得金額: 58万円超 ~ 133万円以下
 * 本人の合計所得金額が1,000万円超: 適用不可
 */
interface SpouseSpecialDeductionEntry {
  /** 配偶者の所得下限 (円, exclusive) */
  minSpouseIncome: number;
  /** 配偶者の所得上限 (円, inclusive) */
  maxSpouseIncome: number;
  /** [所得税] 本人所得900万以下, 950万以下, 1000万以下 */
  incomeTax: [number, number, number];
  /** [住民税] 本人所得900万以下, 950万以下, 1000万以下 */
  residentTax: [number, number, number];
}

const SPOUSE_SPECIAL_DEDUCTION_R7: SpouseSpecialDeductionEntry[] = [
  // 所得税は国税庁 No.1195、住民税は中央区の令和8年度マトリックスを使用
  {
    minSpouseIncome: 580_000,
    maxSpouseIncome: 950_000,
    incomeTax: [380_000, 260_000, 130_000],
    residentTax: [330_000, 220_000, 110_000],
  },
  {
    minSpouseIncome: 950_000,
    maxSpouseIncome: 1_000_000,
    incomeTax: [360_000, 240_000, 120_000],
    residentTax: [330_000, 220_000, 110_000],
  },
  {
    minSpouseIncome: 1_000_000,
    maxSpouseIncome: 1_050_000,
    incomeTax: [310_000, 210_000, 110_000],
    residentTax: [310_000, 210_000, 110_000],
  },
  {
    minSpouseIncome: 1_050_000,
    maxSpouseIncome: 1_100_000,
    incomeTax: [260_000, 180_000, 90_000],
    residentTax: [260_000, 180_000, 90_000],
  },
  {
    minSpouseIncome: 1_100_000,
    maxSpouseIncome: 1_150_000,
    incomeTax: [210_000, 140_000, 70_000],
    residentTax: [210_000, 140_000, 70_000],
  },
  {
    minSpouseIncome: 1_150_000,
    maxSpouseIncome: 1_200_000,
    incomeTax: [160_000, 110_000, 60_000],
    residentTax: [160_000, 110_000, 60_000],
  },
  {
    minSpouseIncome: 1_200_000,
    maxSpouseIncome: 1_250_000,
    incomeTax: [110_000, 80_000, 40_000],
    residentTax: [110_000, 80_000, 40_000],
  },
  {
    minSpouseIncome: 1_250_000,
    maxSpouseIncome: 1_300_000,
    incomeTax: [60_000, 40_000, 20_000],
    residentTax: [60_000, 40_000, 20_000],
  },
  {
    minSpouseIncome: 1_300_000,
    maxSpouseIncome: 1_330_000,
    incomeTax: [30_000, 20_000, 10_000],
    residentTax: [30_000, 20_000, 10_000],
  },
  // 133万円超: 適用なし
];

// -----------------------------------------------------------------------------
// 4.4 扶養控除
// -----------------------------------------------------------------------------

/**
 * 扶養控除 (令和7年分以降)
 * 出典: 国税庁 No.1180 (令和7年4月1日現在法令等)
 *
 * 扶養親族の所得要件: 合計所得金額58万円以下 (改正前: 48万円以下)
 * ※16歳未満(年少扶養親族)は控除対象外
 */
type DependentType =
  | "general" // 一般 (16~18歳, 23~69歳)
  | "specific" // 特定 (19~22歳)
  | "elderly" // 老人 (70歳以上, 非同居)
  | "elderlyCoResident"; // 老人 (70歳以上, 同居)

interface DependentDeduction {
  type: DependentType;
  label: string;
  ageRange: string;
  /** 所得税の控除額 (円) */
  incomeTaxDeduction: number;
  /** 住民税の控除額 (円) */
  residentTaxDeduction: number;
}

const DEPENDENT_DEDUCTIONS: DependentDeduction[] = [
  {
    type: "general",
    label: "一般の控除対象扶養親族",
    ageRange: "16歳以上 (特定・老人以外)",
    incomeTaxDeduction: 380_000,
    residentTaxDeduction: 330_000,
  },
  {
    type: "specific",
    label: "特定扶養親族",
    ageRange: "19歳以上23歳未満",
    incomeTaxDeduction: 630_000,
    residentTaxDeduction: 450_000,
  },
  {
    type: "elderly",
    label: "老人扶養親族 (非同居)",
    ageRange: "70歳以上",
    incomeTaxDeduction: 480_000,
    residentTaxDeduction: 380_000,
  },
  {
    type: "elderlyCoResident",
    label: "老人扶養親族 (同居老親等)",
    ageRange: "70歳以上 (直系尊属で同居)",
    incomeTaxDeduction: 580_000,
    residentTaxDeduction: 450_000,
  },
];

/**
 * 令和7年分新設: 特定親族特別控除
 * 出典: 国税庁 令和7年度税制改正
 *
 * 対象: 19歳以上22歳以下の扶養親族で、
 *       合計所得金額が58万円超123万円以下の場合
 *       (給与収入123万円超188万円以下)
 *
 * 控除額は段階的に3万円~63万円 (所得税)
 * ※ 詳細な段階表は要確認 (国税庁の正式テーブルが必要)
 */

// -----------------------------------------------------------------------------
// 4.5 社会保険料控除
// -----------------------------------------------------------------------------

/**
 * 社会保険料控除
 * 出典: 国税庁
 *
 * 控除額 = 支払った社会保険料の全額
 * 所得税・住民税ともに同額
 *
 * 対象: 健康保険料、厚生年金保険料、雇用保険料、介護保険料等
 */
function calculateSocialInsuranceDeduction(totalPremiums: number): number {
  return totalPremiums; // 全額控除
}

// -----------------------------------------------------------------------------
// 4.6 小規模企業共済等掛金控除 (iDeCo含む)
// -----------------------------------------------------------------------------

/**
 * 小規模企業共済等掛金控除
 * 出典: 国税庁 No.1135
 *
 * 控除額 = 支払った掛金の全額
 * 所得税・住民税ともに同額
 *
 * iDeCo (個人型確定拠出年金) の掛金上限 (2025年現在):
 *
 * | 加入者区分                         | 月額上限   | 年額上限   |
 * |-----------------------------------|-----------|-----------|
 * | 第1号被保険者 (自営業)              | 68,000円  | 816,000円 |
 * | 第2号被保険者 (企業年金なし)          | 23,000円  | 276,000円 |
 * | 第2号被保険者 (企業型DC/DB加入)       | 20,000円  | 240,000円 |
 * | 第3号被保険者 (専業主婦等)            | 23,000円  | 276,000円 |
 *
 * ※ 役員は通常、第2号被保険者に該当
 * ※ 企業型DCの事業主掛金との合算で月額5.5万円が上限
 * ※ 2026年12月施行予定の改正で月額6.2万円に引き上げ予定
 */
interface IDeCoLimit {
  category: string;
  monthlyLimit: number;
  annualLimit: number;
}

const IDECO_LIMITS_2025: IDeCoLimit[] = [
  {
    category: "第1号被保険者 (自営業等)",
    monthlyLimit: 68_000,
    annualLimit: 816_000,
  },
  {
    category: "第2号被保険者 (企業年金なし)",
    monthlyLimit: 23_000,
    annualLimit: 276_000,
  },
  {
    category: "第2号被保険者 (企業型DC/DB加入)",
    monthlyLimit: 20_000,
    annualLimit: 240_000,
  },
  {
    category: "第3号被保険者 (専業主婦等)",
    monthlyLimit: 23_000,
    annualLimit: 276_000,
  },
];

// 役員のiDeCo上限 (企業年金なしの場合)
const IDECO_LIMIT_OFFICER_NO_CORPORATE_PENSION = 23_000; // 月額
const IDECO_LIMIT_OFFICER_WITH_DC = 20_000; // 月額 (企業型DC加入時)

// -----------------------------------------------------------------------------
// 4.7 生命保険料控除
// -----------------------------------------------------------------------------

/**
 * 生命保険料控除
 * 出典: 国税庁 No.1140 (令和7年4月1日現在法令等)
 *
 * 【新制度】(平成24年1月1日以後締結)
 *   新生命保険料 / 介護医療保険料 / 新個人年金保険料 (各別に計算)
 *   | 年間支払保険料       | 控除額              |
 *   |--------------------|--------------------|
 *   | ~20,000円          | 全額                |
 *   | 20,001~40,000円    | 支払額 × 1/2 + 10,000 |
 *   | 40,001~80,000円    | 支払額 × 1/4 + 20,000 |
 *   | 80,001円超          | 一律 40,000円        |
 *   各カテゴリの上限: 40,000円 / 合計上限: 120,000円
 *
 * 【旧制度】(平成23年12月31日以前締結)
 *   旧生命保険料 / 旧個人年金保険料 (各別に計算)
 *   | 年間支払保険料        | 控除額              |
 *   |--------------------|--------------------|
 *   | ~25,000円          | 全額                |
 *   | 25,001~50,000円    | 支払額 × 1/2 + 12,500 |
 *   | 50,001~100,000円   | 支払額 × 1/4 + 25,000 |
 *   | 100,001円超         | 一律 50,000円        |
 *   各カテゴリの上限: 50,000円 / 合計上限: 120,000円
 *
 * 【住民税の生命保険料控除】 ※所得税と金額が異なる
 *   新制度: 各カテゴリ上限 28,000円 / 合計上限 70,000円
 *   旧制度: 各カテゴリ上限 35,000円 / 合計上限 70,000円
 *   ※ 住民税の計算式は所得税と異なるため別途定義が必要 (要確認)
 */
const LIFE_INSURANCE_MAX_PER_CATEGORY_NEW = 40_000; // 所得税・新制度
const LIFE_INSURANCE_MAX_PER_CATEGORY_OLD = 50_000; // 所得税・旧制度
const LIFE_INSURANCE_MAX_TOTAL = 120_000; // 所得税・合計上限

const LIFE_INSURANCE_RESIDENT_MAX_PER_CATEGORY_NEW = 28_000; // 住民税・新制度
const LIFE_INSURANCE_RESIDENT_MAX_PER_CATEGORY_OLD = 35_000; // 住民税・旧制度
const LIFE_INSURANCE_RESIDENT_MAX_TOTAL = 70_000; // 住民税・合計上限

function calculateLifeInsuranceDeductionNew(premium: number): number {
  if (premium <= 0) return 0;
  if (premium <= 20_000) return premium;
  if (premium <= 40_000) return premium * 0.5 + 10_000;
  if (premium <= 80_000) return premium * 0.25 + 20_000;
  return LIFE_INSURANCE_MAX_PER_CATEGORY_NEW;
}

function calculateLifeInsuranceDeductionOld(premium: number): number {
  if (premium <= 0) return 0;
  if (premium <= 25_000) return premium;
  if (premium <= 50_000) return premium * 0.5 + 12_500;
  if (premium <= 100_000) return premium * 0.25 + 25_000;
  return LIFE_INSURANCE_MAX_PER_CATEGORY_OLD;
}

/**
 * 新旧両方の保険に加入している場合の1カテゴリの控除額
 * - 旧制度の年間保険料が6万円超 → 旧制度のみ適用 (最高5万円)
 * - 旧制度の年間保険料が6万円以下 → 新旧合算 (最高4万円)
 */
function calculateLifeInsuranceCategoryDeduction(
  newPremium: number,
  oldPremium: number
): number {
  if (newPremium === 0 && oldPremium === 0) return 0;
  if (newPremium === 0) return calculateLifeInsuranceDeductionOld(oldPremium);
  if (oldPremium === 0) return calculateLifeInsuranceDeductionNew(newPremium);

  // 両方加入の場合
  if (oldPremium > 60_000) {
    // 旧制度のみ
    return calculateLifeInsuranceDeductionOld(oldPremium);
  }
  // 新旧合算 (上限4万円)
  return Math.min(
    calculateLifeInsuranceDeductionNew(newPremium) +
      calculateLifeInsuranceDeductionOld(oldPremium),
    LIFE_INSURANCE_MAX_PER_CATEGORY_NEW
  );
}

// -----------------------------------------------------------------------------
// 4.8 医療費控除
// -----------------------------------------------------------------------------

/**
 * 医療費控除
 * 出典: 国税庁 No.1120
 *
 * 控除額 = (実際に支払った医療費 - 保険金等補填額) - 10万円
 *          ※ 総所得金額等が200万円未満の場合は 総所得金額等 × 5%
 *
 * 上限: 200万円
 *
 * セルフメディケーション税制との選択適用 (併用不可):
 *   控除額 = 特定一般用医薬品等購入費 - 12,000円 (上限88,000円)
 *
 * 所得税・住民税ともに同額の控除
 */
const MEDICAL_EXPENSE_THRESHOLD = 100_000;
const MEDICAL_EXPENSE_MAX_DEDUCTION = 2_000_000;

function calculateMedicalExpenseDeduction(
  totalMedicalExpenses: number,
  insuranceReimbursement: number,
  totalIncomeAmount: number
): number {
  const netExpenses = Math.max(
    0,
    totalMedicalExpenses - insuranceReimbursement
  );
  const threshold =
    totalIncomeAmount < 2_000_000
      ? totalIncomeAmount * 0.05
      : MEDICAL_EXPENSE_THRESHOLD;

  return Math.min(
    Math.max(0, netExpenses - threshold),
    MEDICAL_EXPENSE_MAX_DEDUCTION
  );
}

// =============================================================================
// 5. 所得税と住民税の控除額差異まとめ
// =============================================================================

/**
 * 所得税と住民税で控除額が異なるケースの一覧
 *
 * | 控除の種類               | 所得税    | 住民税    | 差額      |
 * |------------------------|----------|----------|----------|
 * | 基礎控除 (所得2350万以下) | 580,000  | 430,000  | 150,000  |
 * | 基礎控除 (所得132万以下)  | 950,000  | 430,000  | 520,000  |
 * | 配偶者控除 (一般)         | 380,000  | 330,000  | 50,000   |
 * | 配偶者控除 (老人)         | 480,000  | 380,000  | 100,000  |
 * | 扶養控除 (一般)           | 380,000  | 330,000  | 50,000   |
 * | 扶養控除 (特定)           | 630,000  | 450,000  | 180,000  |
 * | 扶養控除 (老人)           | 480,000  | 380,000  | 100,000  |
 * | 扶養控除 (同居老親)        | 580,000  | 450,000  | 130,000  |
 * | 障害者控除 (一般)          | 270,000  | 260,000  | 10,000   |
 * | 障害者控除 (特別)          | 400,000  | 300,000  | 100,000  |
 * | 障害者控除 (同居特別)       | 750,000  | 530,000  | 220,000  |
 * | 寡婦控除                  | 270,000  | 260,000  | 10,000   |
 * | ひとり親控除 (母)          | 350,000  | 300,000  | 50,000   |
 * | ひとり親控除 (父)          | 350,000  | 300,000  | 50,000   |
 * | 勤労学生控除               | 270,000  | 260,000  | 10,000   |
 * |--------------------------|----------|----------|----------|
 * | 社会保険料控除             | 全額     | 全額     | なし      |
 * | 小規模企業共済等掛金控除    | 全額     | 全額     | なし      |
 * | 生命保険料控除 (上限)       | 120,000  | 70,000   | 50,000   |
 * | 医療費控除                | 同額     | 同額     | なし      |
 */

// =============================================================================
// 6. エッジケースと注意点
// =============================================================================

/**
 * 6.1 定額減税 (令和6年限りの一時措置)
 *
 * 出典: 総務省、国税庁
 *
 * 所得税: 令和6年(2024年)分のみ。1人3万円。令和7年は廃止。
 * 住民税: 令和6年度(2024年度)分のみ。1人1万円。
 *
 * ※ 例外: 令和7年度住民税で一部継続
 *   対象: 合計所得1,000万円超1,805万円以下 かつ 同一生計配偶者あり
 *   (給与支払報告書に記載されない同一生計配偶者分の1万円)
 *
 * → シミュレーターでは原則として定額減税は考慮不要 (令和7年分所得税には適用なし)
 */
const FLAT_TAX_REDUCTION_2024_INCOME_TAX = 30_000; // 参考: 令和6年のみ
const FLAT_TAX_REDUCTION_2024_RESIDENT_TAX = 10_000; // 参考: 令和6年のみ

/**
 * 6.2 役員報酬が高額な場合の注意点
 *
 * - 合計所得金額2,500万円超: 基礎控除が0円
 * - 合計所得金額1,000万円超: 配偶者控除・配偶者特別控除が適用不可
 * - 給与所得控除の上限: 850万円超で一律195万円
 *   → 役員報酬を上げても控除額は増えない
 * - 所得税の最高税率: 45% (課税所得4,000万円超)
 *   + 復興特別所得税 2.1% + 住民税 10%
 *   → 実効最高税率は約55.945%
 *
 *   計算: 所得税45% × 1.021 + 住民税10% = 45.945% + 10% = 55.945%
 */

/**
 * 6.3 給与所得控除の改正適用タイミング
 *
 * 令和7年度税制改正 (基礎控除・給与所得控除の見直し) は
 * 原則として令和7年12月1日に施行。
 *
 * → 令和7年11月までの月次源泉徴収には影響なし
 * → 年末調整または確定申告で反映
 * → 住民税は令和8年度分から反映
 */

// =============================================================================
// 7. メイン計算フロー (擬似コード)
// =============================================================================

interface SimulationInput {
  /** 役員報酬 (年額, 円) */
  annualCompensation: number;

  /** 配偶者の有無・年齢・所得 */
  spouse?: {
    income: number;
    isElderly: boolean; // 70歳以上
  };

  /** 扶養親族 */
  dependents: {
    type: DependentType;
    count: number;
  }[];

  /** 社会保険料 (年額) */
  socialInsurancePremiums: number;

  /** iDeCo掛金 (年額) */
  iDeCoContribution: number;

  /** 小規模企業共済掛金 (年額) */
  smallBusinessMutualAidContribution: number;

  /** 生命保険料 */
  lifeInsurance: {
    newLifePremium: number;
    newMedicalPremium: number;
    newPensionPremium: number;
    oldLifePremium: number;
    oldPensionPremium: number;
  };

  /** 医療費 */
  medicalExpenses: {
    total: number;
    insuranceReimbursement: number;
  };
}

interface SimulationResult {
  /** 給与収入 (= 役員報酬) */
  grossIncome: number;
  /** 給与所得控除額 */
  employmentIncomeDeduction: number;
  /** 給与所得 */
  employmentIncome: number;

  /** 所得控除合計 (所得税) */
  totalDeductionsIncomeTax: number;
  /** 所得控除合計 (住民税) */
  totalDeductionsResidentTax: number;

  /** 課税所得 (所得税) */
  taxableIncomeForIncomeTax: number;
  /** 課税所得 (住民税) */
  taxableIncomeForResidentTax: number;

  /** 所得税額 */
  incomeTax: number;
  /** 復興特別所得税額 */
  reconstructionTax: number;
  /** 住民税所得割額 */
  residentIncomeTax: number;
  /** 住民税均等割額 */
  residentPerCapitaTax: number;
  /** 調整控除額 */
  adjustmentDeduction: number;

  /** 税金合計 */
  totalTax: number;
  /** 手取り (概算: 報酬 - 社会保険料 - 税金) */
  netIncome: number;

  /** 実効税率 (税金合計 / 給与収入) */
  effectiveTaxRate: number;
}

/**
 * メイン計算関数
 */
function simulateTax(input: SimulationInput): SimulationResult {
  // Step 1: 給与所得を計算
  const grossIncome = input.annualCompensation;
  const employmentIncomeDeduction =
    calculateEmploymentIncomeDeduction(grossIncome);
  const employmentIncome = Math.max(
    0,
    grossIncome - employmentIncomeDeduction
  );

  // Step 2: 各種所得控除を計算 (所得税)
  const basicDeductionIT = getBasicDeduction(employmentIncome, "incomeTax");
  const socialInsuranceDeduction = input.socialInsurancePremiums;
  const smallBusinessDeduction =
    input.iDeCoContribution + input.smallBusinessMutualAidContribution;

  // 生命保険料控除 (所得税)
  const lifeCategory = calculateLifeInsuranceCategoryDeduction(
    input.lifeInsurance.newLifePremium,
    input.lifeInsurance.oldLifePremium
  );
  const medicalCategory = calculateLifeInsuranceDeductionNew(
    input.lifeInsurance.newMedicalPremium
  );
  const pensionCategory = calculateLifeInsuranceCategoryDeduction(
    input.lifeInsurance.newPensionPremium,
    input.lifeInsurance.oldPensionPremium
  );
  const lifeInsuranceDeductionIT = Math.min(
    lifeCategory + medicalCategory + pensionCategory,
    LIFE_INSURANCE_MAX_TOTAL
  );

  // 医療費控除
  const medicalDeduction = calculateMedicalExpenseDeduction(
    input.medicalExpenses.total,
    input.medicalExpenses.insuranceReimbursement,
    employmentIncome
  );

  // 配偶者控除 / 配偶者特別控除 (所得税)
  let spouseDeductionIT = 0;
  if (input.spouse && employmentIncome <= 10_000_000) {
    if (input.spouse.income <= 580_000) {
      // 配偶者控除
      const entry = SPOUSE_DEDUCTION.find(
        (e) => employmentIncome <= e.maxOwnerIncome
      );
      if (entry) {
        spouseDeductionIT = input.spouse.isElderly
          ? entry.incomeTaxElderly
          : entry.incomeTaxGeneral;
      }
    } else if (input.spouse.income <= 1_330_000) {
      // 配偶者特別控除
      const ownerIdx =
        employmentIncome <= 9_000_000
          ? 0
          : employmentIncome <= 9_500_000
            ? 1
            : 2;
      const entry = SPOUSE_SPECIAL_DEDUCTION_R7.find(
        (e) =>
          input.spouse!.income > e.minSpouseIncome &&
          input.spouse!.income <= e.maxSpouseIncome
      );
      if (entry) {
        spouseDeductionIT = entry.incomeTax[ownerIdx];
      }
    }
  }

  // 扶養控除 (所得税)
  let dependentDeductionIT = 0;
  for (const dep of input.dependents) {
    const deduction = DEPENDENT_DEDUCTIONS.find((d) => d.type === dep.type);
    if (deduction) {
      dependentDeductionIT += deduction.incomeTaxDeduction * dep.count;
    }
  }

  const totalDeductionsIT =
    basicDeductionIT +
    socialInsuranceDeduction +
    smallBusinessDeduction +
    lifeInsuranceDeductionIT +
    medicalDeduction +
    spouseDeductionIT +
    dependentDeductionIT;

  // Step 3: 課税所得を計算 (所得税)
  const taxableIncomeIT = Math.max(0, employmentIncome - totalDeductionsIT);

  // Step 4: 所得税を計算
  const incomeTax = calculateIncomeTax(taxableIncomeIT);
  const reconstructionTax = Math.floor(incomeTax * RECONSTRUCTION_TAX_RATE);

  // Step 5: 住民税の所得控除を計算
  const basicDeductionRT = getBasicDeduction(employmentIncome, "residentTax");

  // 生命保険料控除 (住民税) - ここでは簡略化して上限値を使用
  // TODO: 住民税用の生命保険料控除計算関数を実装
  const lifeInsuranceDeductionRT = Math.min(
    lifeInsuranceDeductionIT,
    LIFE_INSURANCE_RESIDENT_MAX_TOTAL
  );

  // 配偶者控除 / 配偶者特別控除 (住民税)
  let spouseDeductionRT = 0;
  if (input.spouse && employmentIncome <= 10_000_000) {
    if (input.spouse.income <= 580_000) {
      const entry = SPOUSE_DEDUCTION.find(
        (e) => employmentIncome <= e.maxOwnerIncome
      );
      if (entry) {
        spouseDeductionRT = input.spouse.isElderly
          ? entry.residentTaxElderly
          : entry.residentTaxGeneral;
      }
    } else if (input.spouse.income <= 1_330_000) {
      const ownerIdx =
        employmentIncome <= 9_000_000
          ? 0
          : employmentIncome <= 9_500_000
            ? 1
            : 2;
      const entry = SPOUSE_SPECIAL_DEDUCTION_R7.find(
        (e) =>
          input.spouse!.income > e.minSpouseIncome &&
          input.spouse!.income <= e.maxSpouseIncome
      );
      if (entry) {
        spouseDeductionRT = entry.residentTax[ownerIdx];
      }
    }
  }

  // 扶養控除 (住民税)
  let dependentDeductionRT = 0;
  for (const dep of input.dependents) {
    const deduction = DEPENDENT_DEDUCTIONS.find((d) => d.type === dep.type);
    if (deduction) {
      dependentDeductionRT += deduction.residentTaxDeduction * dep.count;
    }
  }

  const totalDeductionsRT =
    basicDeductionRT +
    socialInsuranceDeduction +
    smallBusinessDeduction +
    lifeInsuranceDeductionRT +
    medicalDeduction +
    spouseDeductionRT +
    dependentDeductionRT;

  // Step 6: 住民税の課税所得
  const taxableIncomeRT = Math.max(0, employmentIncome - totalDeductionsRT);

  // Step 7: 調整控除を計算
  let personalDeductionDiff = 50_000; // 基礎控除の差額
  if (input.spouse && employmentIncome <= 10_000_000) {
    if (input.spouse.income <= 580_000) {
      personalDeductionDiff += input.spouse.isElderly ? 100_000 : 50_000;
    }
  }
  for (const dep of input.dependents) {
    const diff = PERSONAL_DEDUCTION_DIFFERENCES.find(
      (d) => d.type === "dependent" && d.subtype === dep.type
    );
    if (diff) {
      personalDeductionDiff += diff.difference * dep.count;
    }
  }

  const adjustmentDeduction = calculateAdjustmentDeduction(
    taxableIncomeRT,
    employmentIncome,
    personalDeductionDiff
  );

  // Step 8: 住民税を計算
  const residentIncomeTax = calculateResidentIncomeTax(
    taxableIncomeRT,
    adjustmentDeduction
  );
  const residentPerCapitaTax = RESIDENT_TAX_PER_CAPITA_TOTAL;

  // Step 9: 合計
  const totalTax =
    incomeTax + reconstructionTax + residentIncomeTax + residentPerCapitaTax;
  const netIncome = grossIncome - input.socialInsurancePremiums - totalTax;

  return {
    grossIncome,
    employmentIncomeDeduction,
    employmentIncome,
    totalDeductionsIncomeTax: totalDeductionsIT,
    totalDeductionsResidentTax: totalDeductionsRT,
    taxableIncomeForIncomeTax: taxableIncomeIT,
    taxableIncomeForResidentTax: taxableIncomeRT,
    incomeTax,
    reconstructionTax,
    residentIncomeTax,
    residentPerCapitaTax,
    adjustmentDeduction,
    totalTax,
    netIncome,
    effectiveTaxRate: grossIncome > 0 ? totalTax / grossIncome : 0,
  };
}

// =============================================================================
// 8. 要確認事項
// =============================================================================

/**
 * 以下の項目は公式ソースで完全には確認できなかったため、
 * 実装時に追加調査が必要:
 *
 * 1. 住民税の生命保険料控除の計算式 (所得税とは異なる計算テーブル)
 *    - 新制度: 各カテゴリ上限28,000円 / 合計上限70,000円
 *    - 旧制度: 各カテゴリ上限35,000円 / 合計上限70,000円
 *    - 計算式の段階が所得税とは異なる → 自治体の公式資料で確認必要
 *
 * 2. 特定親族特別控除 (令和7年新設) の段階別控除額テーブル
 *    - 19~22歳の扶養親族で所得58万超123万以下の場合
 *    - 控除額3万~63万の詳細段階表 → 国税庁の正式テーブル待ち
 *
 * 3. 住民税の基礎控除における令和7年度改正の有無
 *    - 所得税は大幅引き上げ (最大95万円)
 *    - 住民税は43万円据え置きとの情報が複数あるが、
 *      令和8年度以降に一部引き上げの可能性あり
 *    - 総務省の正式通達を確認する必要あり
 *
 * 4. 人的控除差額表のひとり親控除 (父) の差額
 *    - 静岡市のページでは1万円と記載されているが、
 *      所得税350,000 - 住民税300,000 = 50,000円のはず
 *    - 「人的控除額の差は必ずしも個人住民税と所得税の差額とは
 *      一致しません」との注記があるため、法令で定められた差額を使用
 *    → 地方税法の条文で正確な値を確認する必要あり
 *
 * 5. 配偶者特別控除マトリックスの住民税側
 *    - 所得税は国税庁で確認済み
 *    - 住民税は中央区のサイトで令和8年度版を確認したが、
 *      一部セルが「※含む」となっていて金額が不明確
 *    - 950万超~1000万以下かつ所得58万超~100万以下 → 11万円と推定
 *    - 100万超~105万以下の住民税950~1000万帯も確認が必要
 */

export {
  // 定数
  INCOME_TAX_BRACKETS,
  RECONSTRUCTION_TAX_RATE,
  EMPLOYMENT_INCOME_DEDUCTION_R7,
  RESIDENT_TAX_TOTAL_RATE,
  RESIDENT_TAX_PER_CAPITA_TOTAL,
  BASIC_DEDUCTION_R7_R8,
  SPOUSE_DEDUCTION,
  SPOUSE_SPECIAL_DEDUCTION_R7,
  DEPENDENT_DEDUCTIONS,
  IDECO_LIMITS_2025,
  LIFE_INSURANCE_MAX_TOTAL,
  LIFE_INSURANCE_RESIDENT_MAX_TOTAL,
  PERSONAL_DEDUCTION_DIFFERENCES,
  // 関数
  calculateIncomeTax,
  calculateTotalIncomeTax,
  calculateEmploymentIncomeDeduction,
  calculateEmploymentIncome,
  calculateResidentIncomeTax,
  calculateAdjustmentDeduction,
  getBasicDeduction,
  calculateSocialInsuranceDeduction,
  calculateLifeInsuranceDeductionNew,
  calculateLifeInsuranceDeductionOld,
  calculateLifeInsuranceCategoryDeduction,
  calculateMedicalExpenseDeduction,
  simulateTax,
  // 型
  type SimulationInput,
  type SimulationResult,
  type IncomeTaxBracket,
  type DependentType,
};
