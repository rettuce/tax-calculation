/**
 * 一人法人の役員報酬に対する社会保険料 計算ロジック設計
 *
 * 対象: 令和7年度（2025年度）= 令和7年3月分（4月納付分）から適用
 *
 * 公式ソース:
 * - 協会けんぽ 令和7年度 都道府県別保険料率
 *   https://www.kyoukaikenpo.or.jp/g7/cat330/sb3130/
 * - 協会けんぽ 東京支部 臨時号 2025年度保険料率
 *   https://www.kyoukaikenpo.or.jp/shibu/tokyo/cat130/20250214/
 * - 日本年金機構 厚生年金保険料額表（令和7年度）
 *   https://www.nenkin.go.jp/service/kounen/hokenryo/ryogaku/ryogakuhyo/20200825.html
 * - 日本年金機構 厚生年金保険の保険料
 *   https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20150515-01.html
 * - 日本年金機構 標準報酬月額・賞与等
 *   https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/index.html
 * - 日本年金機構 定時決定（算定基礎届）
 *   https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20121017.html
 * - 日本年金機構 随時改定（月額変更届）
 *   https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20150515-02.html
 * - 日本年金機構 賞与を支給したときの手続き
 *   https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20141203.html
 * - 日本年金機構 標準賞与額累計573万円超過時
 *   https://www.nenkin.go.jp/shinsei/kounen/tekiyo/shoyo/20120314-01.html
 */

// =============================================================================
// 1. 保険料率の定義（令和7年度 / 2025年度）
// =============================================================================

/**
 * 健康保険料率（協会けんぽ・東京都）
 *
 * 出典: 協会けんぽ 令和7年度 東京支部保険料率
 * 適用: 令和7年3月分（4月納付分）から
 *
 * 東京都の健康保険料率: 9.91%（令和6年度 9.98% から 0.07% 引き下げ）
 * 全国平均: 10.00%
 *
 * 内訳（参考）:
 *   基本保険料率: 6.53%（給付等に充当）
 *   特定保険料率: 3.38%（後期高齢者医療制度への支援金等に充当）
 *
 * 労使折半: 事業主 4.955%, 被保険者 4.955%
 */
const HEALTH_INSURANCE_RATE_TOKYO = 0.0991;
const HEALTH_INSURANCE_RATE_TOKYO_HALF = 0.04955;

/**
 * 介護保険料率（全国一律）
 *
 * 出典: 協会けんぽ 令和7年度介護保険料率
 * 適用: 40歳以上65歳未満の被保険者（介護保険第2号被保険者）
 * 料率: 1.59%（令和6年度 1.60% から 0.01% 引き下げ）
 * 労使折半: 事業主 0.795%, 被保険者 0.795%
 */
const NURSING_CARE_INSURANCE_RATE = 0.0159;
const NURSING_CARE_INSURANCE_RATE_HALF = 0.00795;

/**
 * 健康保険 + 介護保険の合計料率（40歳以上65歳未満の場合）
 * 9.91% + 1.59% = 11.50%
 */
const HEALTH_PLUS_NURSING_RATE_TOKYO = 0.115;
const HEALTH_PLUS_NURSING_RATE_TOKYO_HALF = 0.0575;

/**
 * 厚生年金保険料率
 *
 * 出典: 日本年金機構 厚生年金保険の保険料
 * 料率: 18.300%（平成29年9月以降固定、段階的引き上げ終了済み）
 * 労使折半: 事業主 9.150%, 被保険者 9.150%
 */
const PENSION_INSURANCE_RATE = 0.183;
const PENSION_INSURANCE_RATE_HALF = 0.0915;

/**
 * 子ども・子育て拠出金率
 *
 * 出典: 日本年金機構
 * 料率: 0.36%（1000分の3.6）
 * ※ 事業主のみ全額負担（被保険者負担なし）
 * ※ 令和2年4月に 0.34% → 0.36% に改定、以降変更なし
 * ※ 厚生年金保険の標準報酬月額・標準賞与額を基に算出
 * ※ 標準賞与額の上限は厚生年金と同じ（1回150万円）
 */
const CHILD_CARE_CONTRIBUTION_RATE = 0.0036;

// =============================================================================
// 2. 標準報酬月額 等級テーブル
// =============================================================================

/**
 * 健康保険と厚生年金保険では等級体系が異なる:
 * - 健康保険:  第1等級（58,000円）～ 第50等級（1,390,000円）の50段階
 * - 厚生年金:  第1等級（88,000円）～ 第32等級（650,000円）の32段階
 *
 * 出典:
 * - 協会けんぽ 標準報酬月額・標準賞与額
 *   https://www.kyoukaikenpo.or.jp/g7/cat710/sb3160/sbb3165/
 * - 日本年金機構 厚生年金保険料額表
 *   https://www.nenkin.go.jp/service/kounen/hokenryo/ryogaku/ryogakuhyo/20200825.html
 * - SCSK健康保険組合 標準報酬月額と保険料一覧（全50等級確認）
 *   https://www.kenpo.gr.jp/scsk-kenpo/contents/01shikumi/h_ryou/hyou.html
 */

interface StandardRemunerationGrade {
  /** 健康保険の等級番号 (1-50) */
  healthGrade: number;
  /** 厚生年金の等級番号 (1-32), null = 厚生年金の等級範囲外 */
  pensionGrade: number | null;
  /** 標準報酬月額 (円) */
  standardMonthly: number;
  /** 報酬月額の下限 (円), null = 下限なし（最低等級） */
  lowerBound: number | null;
  /** 報酬月額の上限 (円), null = 上限なし（最高等級） */
  upperBound: number | null;
}

/**
 * 標準報酬月額 全等級テーブル
 *
 * 健康保険: 第1級(58,000)〜第50級(1,390,000) の50段階
 * 厚生年金: 第1級(88,000)〜第32級(650,000) の32段階
 *
 * 注意:
 * - 健保1-3級（58,000〜78,000）は厚生年金では全て第1級（88,000）扱い
 * - 健保35級（650,000）が厚生年金の最高等級（第32級）
 * - 健保36-50級（680,000〜1,390,000）は厚生年金では全て第32級（650,000）扱い
 *
 * upperBound は「未満」を意味する（例: 63,000 = 63,000円未満）
 * 最低等級の lowerBound は null（下限なし）
 * 最高等級の upperBound は null（上限なし = 報酬がいくら高くても最高等級）
 */
const STANDARD_REMUNERATION_GRADES: StandardRemunerationGrade[] = [
  // --- 健保のみの等級（厚生年金は第1級 88,000 が適用される） ---
  { healthGrade: 1, pensionGrade: null, standardMonthly: 58_000, lowerBound: null, upperBound: 63_000 },
  { healthGrade: 2, pensionGrade: null, standardMonthly: 68_000, lowerBound: 63_000, upperBound: 73_000 },
  { healthGrade: 3, pensionGrade: null, standardMonthly: 78_000, lowerBound: 73_000, upperBound: 83_000 },

  // --- 健保・厚生年金の共通等級帯 ---
  { healthGrade: 4, pensionGrade: 1, standardMonthly: 88_000, lowerBound: 83_000, upperBound: 93_000 },
  { healthGrade: 5, pensionGrade: 2, standardMonthly: 98_000, lowerBound: 93_000, upperBound: 101_000 },
  { healthGrade: 6, pensionGrade: 3, standardMonthly: 104_000, lowerBound: 101_000, upperBound: 107_000 },
  { healthGrade: 7, pensionGrade: 4, standardMonthly: 110_000, lowerBound: 107_000, upperBound: 114_000 },
  { healthGrade: 8, pensionGrade: 5, standardMonthly: 118_000, lowerBound: 114_000, upperBound: 122_000 },
  { healthGrade: 9, pensionGrade: 6, standardMonthly: 126_000, lowerBound: 122_000, upperBound: 130_000 },
  { healthGrade: 10, pensionGrade: 7, standardMonthly: 134_000, lowerBound: 130_000, upperBound: 138_000 },
  { healthGrade: 11, pensionGrade: 8, standardMonthly: 142_000, lowerBound: 138_000, upperBound: 146_000 },
  { healthGrade: 12, pensionGrade: 9, standardMonthly: 150_000, lowerBound: 146_000, upperBound: 155_000 },
  { healthGrade: 13, pensionGrade: 10, standardMonthly: 160_000, lowerBound: 155_000, upperBound: 165_000 },
  { healthGrade: 14, pensionGrade: 11, standardMonthly: 170_000, lowerBound: 165_000, upperBound: 175_000 },
  { healthGrade: 15, pensionGrade: 12, standardMonthly: 180_000, lowerBound: 175_000, upperBound: 185_000 },
  { healthGrade: 16, pensionGrade: 13, standardMonthly: 190_000, lowerBound: 185_000, upperBound: 195_000 },
  { healthGrade: 17, pensionGrade: 14, standardMonthly: 200_000, lowerBound: 195_000, upperBound: 210_000 },
  { healthGrade: 18, pensionGrade: 15, standardMonthly: 220_000, lowerBound: 210_000, upperBound: 230_000 },
  { healthGrade: 19, pensionGrade: 16, standardMonthly: 240_000, lowerBound: 230_000, upperBound: 250_000 },
  { healthGrade: 20, pensionGrade: 17, standardMonthly: 260_000, lowerBound: 250_000, upperBound: 270_000 },
  { healthGrade: 21, pensionGrade: 18, standardMonthly: 280_000, lowerBound: 270_000, upperBound: 290_000 },
  { healthGrade: 22, pensionGrade: 19, standardMonthly: 300_000, lowerBound: 290_000, upperBound: 310_000 },
  { healthGrade: 23, pensionGrade: 20, standardMonthly: 320_000, lowerBound: 310_000, upperBound: 330_000 },
  { healthGrade: 24, pensionGrade: 21, standardMonthly: 340_000, lowerBound: 330_000, upperBound: 350_000 },
  { healthGrade: 25, pensionGrade: 22, standardMonthly: 360_000, lowerBound: 350_000, upperBound: 370_000 },
  { healthGrade: 26, pensionGrade: 23, standardMonthly: 380_000, lowerBound: 370_000, upperBound: 395_000 },
  { healthGrade: 27, pensionGrade: 24, standardMonthly: 410_000, lowerBound: 395_000, upperBound: 425_000 },
  { healthGrade: 28, pensionGrade: 25, standardMonthly: 440_000, lowerBound: 425_000, upperBound: 455_000 },
  { healthGrade: 29, pensionGrade: 26, standardMonthly: 470_000, lowerBound: 455_000, upperBound: 485_000 },
  { healthGrade: 30, pensionGrade: 27, standardMonthly: 500_000, lowerBound: 485_000, upperBound: 515_000 },
  { healthGrade: 31, pensionGrade: 28, standardMonthly: 530_000, lowerBound: 515_000, upperBound: 545_000 },
  { healthGrade: 32, pensionGrade: 29, standardMonthly: 560_000, lowerBound: 545_000, upperBound: 575_000 },
  { healthGrade: 33, pensionGrade: 30, standardMonthly: 590_000, lowerBound: 575_000, upperBound: 605_000 },
  { healthGrade: 34, pensionGrade: 31, standardMonthly: 620_000, lowerBound: 605_000, upperBound: 635_000 },
  { healthGrade: 35, pensionGrade: 32, standardMonthly: 650_000, lowerBound: 635_000, upperBound: 665_000 },

  // --- 健保のみの高等級帯（厚生年金は第32級 650,000 が上限） ---
  { healthGrade: 36, pensionGrade: null, standardMonthly: 680_000, lowerBound: 665_000, upperBound: 695_000 },
  { healthGrade: 37, pensionGrade: null, standardMonthly: 710_000, lowerBound: 695_000, upperBound: 730_000 },
  { healthGrade: 38, pensionGrade: null, standardMonthly: 750_000, lowerBound: 730_000, upperBound: 770_000 },
  { healthGrade: 39, pensionGrade: null, standardMonthly: 790_000, lowerBound: 770_000, upperBound: 810_000 },
  { healthGrade: 40, pensionGrade: null, standardMonthly: 830_000, lowerBound: 810_000, upperBound: 855_000 },
  { healthGrade: 41, pensionGrade: null, standardMonthly: 880_000, lowerBound: 855_000, upperBound: 905_000 },
  { healthGrade: 42, pensionGrade: null, standardMonthly: 930_000, lowerBound: 905_000, upperBound: 955_000 },
  { healthGrade: 43, pensionGrade: null, standardMonthly: 980_000, lowerBound: 955_000, upperBound: 1_005_000 },
  { healthGrade: 44, pensionGrade: null, standardMonthly: 1_030_000, lowerBound: 1_005_000, upperBound: 1_055_000 },
  { healthGrade: 45, pensionGrade: null, standardMonthly: 1_090_000, lowerBound: 1_055_000, upperBound: 1_115_000 },
  { healthGrade: 46, pensionGrade: null, standardMonthly: 1_150_000, lowerBound: 1_115_000, upperBound: 1_175_000 },
  { healthGrade: 47, pensionGrade: null, standardMonthly: 1_210_000, lowerBound: 1_175_000, upperBound: 1_235_000 },
  { healthGrade: 48, pensionGrade: null, standardMonthly: 1_270_000, lowerBound: 1_235_000, upperBound: 1_295_000 },
  { healthGrade: 49, pensionGrade: null, standardMonthly: 1_330_000, lowerBound: 1_295_000, upperBound: 1_355_000 },
  { healthGrade: 50, pensionGrade: null, standardMonthly: 1_390_000, lowerBound: 1_355_000, upperBound: null },
];

// =============================================================================
// 3. 標準報酬月額の決定ルール
// =============================================================================

/**
 * 定時決定（算定基礎届）
 *
 * 出典: 日本年金機構 定時決定
 * https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20121017.html
 *
 * - 毎年7月1日時点の全被保険者が対象
 * - 4月・5月・6月に支払われた報酬の平均で標準報酬月額を決定
 * - 9月から翌年8月まで適用
 * - 支払基礎日数17日以上の月のみ算定対象
 *
 * 一人法人の定期同額給与の場合:
 * - 毎月の報酬が固定のため、4-6月の平均 = 月額報酬そのもの
 * - 算定基礎届は毎年7月に提出が必要
 */

/**
 * 随時改定（月額変更届）
 *
 * 出典: 日本年金機構 随時改定
 * https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20150515-02.html
 *
 * 以下の3条件を全て満たす場合に発動:
 * 1. 昇給・降給等により固定的賃金に変動があった
 * 2. 変動月以降の連続3か月間の報酬の平均額と現在の標準報酬月額に
 *    2等級以上の差が生じた
 * 3. 3か月とも支払基礎日数が17日以上
 *
 * → 変動月から4か月目の標準報酬月額から改定
 *
 * 一人法人の定期同額給与の場合:
 * - 役員報酬の改定（通常は期首から3か月以内）が固定的賃金の変動に該当
 * - 改定後3か月の報酬平均で標準報酬月額が2等級以上変動すれば随時改定
 * - 例: 月額50万円 → 80万円に変更した場合、変更月から4か月目に改定
 */

/**
 * 報酬月額から標準報酬月額を特定する
 *
 * 健康保険用と厚生年金用で別々の標準報酬月額が適用される:
 * - 健康保険: 50等級（58,000円〜1,390,000円）
 * - 厚生年金: 32等級（88,000円〜650,000円）
 *
 * 報酬月額が健保の上限（1,355,000円以上）を超える場合 → 健保は1,390,000円
 * 報酬月額が厚年の上限（635,000円以上）を超える場合 → 厚年は650,000円
 */
interface StandardRemuneration {
  /** 健康保険の標準報酬月額 */
  healthInsurance: number;
  /** 厚生年金の標準報酬月額 */
  pension: number;
  /** 健康保険の等級 */
  healthGrade: number;
  /** 厚生年金の等級 */
  pensionGrade: number;
}

/** 厚生年金の上限標準報酬月額 */
const PENSION_MAX_STANDARD_MONTHLY = 650_000;
/** 厚生年金の下限標準報酬月額 */
const PENSION_MIN_STANDARD_MONTHLY = 88_000;

function getStandardRemuneration(monthlyRemuneration: number): StandardRemuneration {
  // --- 健康保険の標準報酬月額を特定 ---
  const healthGradeEntry = findHealthInsuranceGrade(monthlyRemuneration);

  // --- 厚生年金の標準報酬月額を特定 ---
  // 厚生年金は 88,000〜650,000 の範囲
  let pensionStandard: number;
  let pensionGradeNum: number;

  if (monthlyRemuneration < 93_000) {
    // 厚年第1級: 88,000（報酬93,000未満）
    pensionStandard = 88_000;
    pensionGradeNum = 1;
  } else if (monthlyRemuneration >= 635_000) {
    // 厚年第32級: 650,000（報酬635,000以上）
    pensionStandard = 650_000;
    pensionGradeNum = 32;
  } else {
    // 共通等級帯から特定
    const entry = STANDARD_REMUNERATION_GRADES.find(
      (g) =>
        g.pensionGrade !== null &&
        (g.lowerBound === null || monthlyRemuneration >= g.lowerBound) &&
        (g.upperBound === null || monthlyRemuneration < g.upperBound)
    );
    pensionStandard = entry?.standardMonthly ?? 88_000;
    pensionGradeNum = entry?.pensionGrade ?? 1;
  }

  return {
    healthInsurance: healthGradeEntry.standardMonthly,
    pension: pensionStandard,
    healthGrade: healthGradeEntry.healthGrade,
    pensionGrade: pensionGradeNum,
  };
}

function findHealthInsuranceGrade(
  monthlyRemuneration: number
): StandardRemunerationGrade {
  const grade = STANDARD_REMUNERATION_GRADES.find(
    (g) =>
      (g.lowerBound === null || monthlyRemuneration >= g.lowerBound) &&
      (g.upperBound === null || monthlyRemuneration < g.upperBound)
  );
  // 下限以下は第1級、見つからない場合も第1級
  return grade ?? STANDARD_REMUNERATION_GRADES[0];
}

// =============================================================================
// 4. 賞与（事前確定届出給与）の社会保険料
// =============================================================================

/**
 * 賞与に対する社会保険料
 *
 * 出典: 日本年金機構 賞与を支給したときの手続き
 * https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20141203.html
 *
 * ■ 標準賞与額の算出:
 *   実際の賞与支給額（税引前・総支給額）から1,000円未満を切り捨て
 *
 * ■ 上限額:
 *   健康保険: 年度累計（4月〜翌3月）573万円
 *     → 同一年度内の標準賞与額の合計が573万円を超えた場合、超過分は0円扱い
 *     → 同月内に複数回支給された場合は合算して上限判定
 *
 *   厚生年金: 1回（同月内）あたり150万円
 *     → 同月内に複数回支給された場合は合算して150万円上限
 *     → 子ども・子育て拠出金も同じ150万円上限
 *
 * ■ 保険料率:
 *   月額の標準報酬月額に対する料率と「同じ」料率を標準賞与額に適用
 *   - 健康保険料率: 9.91%（東京都・令和7年度）
 *   - 介護保険料率: 1.59%（40歳以上65歳未満）
 *   - 厚生年金保険料率: 18.3%
 *   - 子ども・子育て拠出金: 0.36%（事業主のみ）
 *
 * ■ 一人法人での賞与:
 *   法人税法上の「事前確定届出給与」として届出が必要。
 *   届出通りの金額・時期に支給しないと全額損金不算入。
 */

/** 健康保険の標準賞与額 年度累計上限 */
const HEALTH_INSURANCE_BONUS_ANNUAL_CAP = 5_730_000;

/** 厚生年金の標準賞与額 1回あたり上限 */
const PENSION_BONUS_PER_PAYMENT_CAP = 1_500_000;

interface BonusPremiumResult {
  /** 標準賞与額（1,000円未満切捨て後、上限適用前） */
  standardBonusRaw: number;
  /** 健康保険に適用される標準賞与額（年度累計上限適用後） */
  healthStandardBonus: number;
  /** 厚生年金に適用される標準賞与額（150万円上限適用後） */
  pensionStandardBonus: number;

  /** 健康保険料（被保険者負担） */
  healthPremiumEmployee: number;
  /** 健康保険料（事業主負担） */
  healthPremiumEmployer: number;
  /** 介護保険料（被保険者負担, 該当者のみ） */
  nursingPremiumEmployee: number;
  /** 介護保険料（事業主負担, 該当者のみ） */
  nursingPremiumEmployer: number;
  /** 厚生年金保険料（被保険者負担） */
  pensionPremiumEmployee: number;
  /** 厚生年金保険料（事業主負担） */
  pensionPremiumEmployer: number;
  /** 子ども・子育て拠出金（事業主のみ） */
  childCarePremium: number;
}

function calculateBonusPremium(
  bonusAmount: number,
  age: number,
  /** 同一年度内の既支給の標準賞与額累計（健康保険用） */
  priorHealthBonusCumulative: number = 0
): BonusPremiumResult {
  // 1,000円未満切り捨て
  const standardBonusRaw = Math.floor(bonusAmount / 1000) * 1000;

  // --- 健康保険の標準賞与額（年度累計上限） ---
  const remainingHealthCap = Math.max(
    0,
    HEALTH_INSURANCE_BONUS_ANNUAL_CAP - priorHealthBonusCumulative
  );
  const healthStandardBonus = Math.min(standardBonusRaw, remainingHealthCap);

  // --- 厚生年金の標準賞与額（1回あたり上限） ---
  const pensionStandardBonus = Math.min(standardBonusRaw, PENSION_BONUS_PER_PAYMENT_CAP);

  // --- 保険料計算 ---
  const isNursingCareTarget = age >= 40 && age < 65;

  // 健康保険料（50銭以下切捨て、50銭超切り上げ = 通常の四捨五入に近いが厳密には異なる）
  // ※ 実務では円未満の端数処理は事業所の規定による。被保険者負担は50銭以下切捨て。
  const healthPremiumTotal = healthStandardBonus * HEALTH_INSURANCE_RATE_TOKYO;
  const healthPremiumEmployee = roundInsurancePremium(healthStandardBonus * HEALTH_INSURANCE_RATE_TOKYO_HALF);
  const healthPremiumEmployer = roundInsurancePremium(healthPremiumTotal) - healthPremiumEmployee;

  let nursingPremiumEmployee = 0;
  let nursingPremiumEmployer = 0;
  if (isNursingCareTarget) {
    const nursingTotal = healthStandardBonus * NURSING_CARE_INSURANCE_RATE;
    nursingPremiumEmployee = roundInsurancePremium(healthStandardBonus * NURSING_CARE_INSURANCE_RATE_HALF);
    nursingPremiumEmployer = roundInsurancePremium(nursingTotal) - nursingPremiumEmployee;
  }

  // 厚生年金保険料
  const pensionPremiumTotal = pensionStandardBonus * PENSION_INSURANCE_RATE;
  const pensionPremiumEmployee = roundInsurancePremium(pensionStandardBonus * PENSION_INSURANCE_RATE_HALF);
  const pensionPremiumEmployer = roundInsurancePremium(pensionPremiumTotal) - pensionPremiumEmployee;

  // 子ども・子育て拠出金（事業主全額）
  const childCarePremium = roundInsurancePremium(pensionStandardBonus * CHILD_CARE_CONTRIBUTION_RATE);

  return {
    standardBonusRaw,
    healthStandardBonus,
    pensionStandardBonus,
    healthPremiumEmployee,
    healthPremiumEmployer,
    nursingPremiumEmployee,
    nursingPremiumEmployer,
    pensionPremiumEmployee,
    pensionPremiumEmployer,
    childCarePremium,
  };
}

// =============================================================================
// 5. 月額の社会保険料計算
// =============================================================================

interface MonthlyPremiumResult {
  /** 標準報酬月額（健康保険） */
  healthStandardMonthly: number;
  /** 標準報酬月額（厚生年金） */
  pensionStandardMonthly: number;
  /** 健保等級 */
  healthGrade: number;
  /** 厚年等級 */
  pensionGrade: number;

  /** 健康保険料（被保険者負担/月） */
  healthPremiumEmployee: number;
  /** 健康保険料（事業主負担/月） */
  healthPremiumEmployer: number;
  /** 介護保険料（被保険者負担/月, 該当者のみ） */
  nursingPremiumEmployee: number;
  /** 介護保険料（事業主負担/月, 該当者のみ） */
  nursingPremiumEmployer: number;
  /** 厚生年金保険料（被保険者負担/月） */
  pensionPremiumEmployee: number;
  /** 厚生年金保険料（事業主負担/月） */
  pensionPremiumEmployer: number;
  /** 子ども・子育て拠出金（事業主のみ/月） */
  childCarePremium: number;

  /** 被保険者の月額合計負担 */
  totalEmployeeMonthly: number;
  /** 事業主の月額合計負担 */
  totalEmployerMonthly: number;
  /** 月額合計（労使合計） */
  totalMonthly: number;
}

function calculateMonthlyPremium(
  monthlyRemuneration: number,
  age: number
): MonthlyPremiumResult {
  const sr = getStandardRemuneration(monthlyRemuneration);
  const isNursingCareTarget = age >= 40 && age < 65;

  // --- 健康保険料 ---
  const healthTotal = sr.healthInsurance * HEALTH_INSURANCE_RATE_TOKYO;
  const healthEmployee = roundInsurancePremium(sr.healthInsurance * HEALTH_INSURANCE_RATE_TOKYO_HALF);
  const healthEmployer = roundInsurancePremium(healthTotal) - healthEmployee;

  // --- 介護保険料 ---
  let nursingEmployee = 0;
  let nursingEmployer = 0;
  if (isNursingCareTarget) {
    const nursingTotal = sr.healthInsurance * NURSING_CARE_INSURANCE_RATE;
    nursingEmployee = roundInsurancePremium(sr.healthInsurance * NURSING_CARE_INSURANCE_RATE_HALF);
    nursingEmployer = roundInsurancePremium(nursingTotal) - nursingEmployee;
  }

  // --- 厚生年金保険料 ---
  const pensionTotal = sr.pension * PENSION_INSURANCE_RATE;
  const pensionEmployee = roundInsurancePremium(sr.pension * PENSION_INSURANCE_RATE_HALF);
  const pensionEmployer = roundInsurancePremium(pensionTotal) - pensionEmployee;

  // --- 子ども・子育て拠出金 ---
  const childCare = roundInsurancePremium(sr.pension * CHILD_CARE_CONTRIBUTION_RATE);

  const totalEmployeeMonthly =
    healthEmployee + nursingEmployee + pensionEmployee;
  const totalEmployerMonthly =
    healthEmployer + nursingEmployer + pensionEmployer + childCare;

  return {
    healthStandardMonthly: sr.healthInsurance,
    pensionStandardMonthly: sr.pension,
    healthGrade: sr.healthGrade,
    pensionGrade: sr.pensionGrade,
    healthPremiumEmployee: healthEmployee,
    healthPremiumEmployer: healthEmployer,
    nursingPremiumEmployee: nursingEmployee,
    nursingPremiumEmployer: nursingEmployer,
    pensionPremiumEmployee: pensionEmployee,
    pensionPremiumEmployer: pensionEmployer,
    childCarePremium: childCare,
    totalEmployeeMonthly,
    totalEmployerMonthly,
    totalMonthly: totalEmployeeMonthly + totalEmployerMonthly,
  };
}

// =============================================================================
// 5.1 端数処理
// =============================================================================

/**
 * 社会保険料の端数処理
 *
 * 出典: 健康保険法第167条、厚生年金保険法第83条
 *
 * 保険料の被保険者負担分について:
 * - 被保険者負担分の端数が50銭以下の場合 → 切り捨て
 * - 被保険者負担分の端数が50銭を超える場合 → 切り上げ
 * （= 通常の四捨五入とほぼ同じだが、ちょうど50銭の場合は切り捨て）
 *
 * ※ 事業所と被保険者の間で特約がある場合はその特約による
 * ※ 一人法人の場合は個人=法人のため実質的に影響は軽微だが、
 *   正確を期すため法令通りの処理を行う
 */
function roundInsurancePremium(amount: number): number {
  // 50銭以下切り捨て、50銭超切り上げ
  const fractional = amount - Math.floor(amount);
  if (fractional <= 0.5) {
    return Math.floor(amount);
  }
  return Math.ceil(amount);
}

// =============================================================================
// 6. 年額の計算（月額 + 賞与の統合）
// =============================================================================

interface AnnualPremiumResult {
  /** 月額保険料の内訳 */
  monthly: MonthlyPremiumResult;

  /** 賞与保険料の内訳（賞与なしの場合はnull） */
  bonus: BonusPremiumResult | null;

  /** 年間の被保険者負担合計 */
  annualEmployeeTotal: number;
  /** 年間の事業主負担合計 */
  annualEmployerTotal: number;
  /** 年間の保険料合計（労使合計） */
  annualTotal: number;

  /**
   * 社会保険料控除として使える年額（被保険者負担分のみ）
   * → 所得税・住民税の社会保険料控除の対象
   */
  annualSocialInsuranceDeduction: number;
}

function calculateAnnualPremium(
  monthlyRemuneration: number,
  bonusAmount: number,
  age: number
): AnnualPremiumResult {
  const monthly = calculateMonthlyPremium(monthlyRemuneration, age);
  const bonus =
    bonusAmount > 0 ? calculateBonusPremium(bonusAmount, age) : null;

  const monthlyEmployeeAnnual = monthly.totalEmployeeMonthly * 12;
  const monthlyEmployerAnnual = monthly.totalEmployerMonthly * 12;

  const bonusEmployeeTotal = bonus
    ? bonus.healthPremiumEmployee +
      bonus.nursingPremiumEmployee +
      bonus.pensionPremiumEmployee
    : 0;
  const bonusEmployerTotal = bonus
    ? bonus.healthPremiumEmployer +
      bonus.nursingPremiumEmployer +
      bonus.pensionPremiumEmployer +
      bonus.childCarePremium
    : 0;

  const annualEmployeeTotal = monthlyEmployeeAnnual + bonusEmployeeTotal;
  const annualEmployerTotal = monthlyEmployerAnnual + bonusEmployerTotal;

  return {
    monthly,
    bonus,
    annualEmployeeTotal,
    annualEmployerTotal,
    annualTotal: annualEmployeeTotal + annualEmployerTotal,
    annualSocialInsuranceDeduction: annualEmployeeTotal,
  };
}

// =============================================================================
// 7. 一人法人の特殊事情
// =============================================================================

/**
 * 一人法人（従業員なし・役員1名のみ）の社会保険に関するまとめ
 *
 * ■ 社会保険（健康保険・厚生年金）: 加入強制
 *   - 法人事業所は強制適用事業所（健康保険法第3条、厚生年金保険法第6条）
 *   - 役員1名のみでも、報酬を受けている限り被保険者として加入義務あり
 *   - 例外: 役員報酬がゼロの場合は加入対象外
 *     （報酬がなければ保険料の徴収ができないため実務上も不可）
 *   - 出典: 厚生労働省 社会保険未適用事業所への加入指導資料
 *     https://kouseikyoku.mhlw.go.jp/tokaihokuriku/shinsei/shido_kansa/hoken_shitei/documents/hoken-miteki.pdf
 *
 * ■ 雇用保険: 適用外
 *   - 法人の役員（代表取締役・取締役等）は労働者に該当しないため加入不可
 *   - 使用人兼務役員の場合は例外的に加入可能だが、一人法人では該当しない
 *   - 出典: 雇用保険法第4条（被保険者の定義）
 *
 * ■ 労災保険: 適用外
 *   - 労災保険は労働者のための制度であり、役員は対象外
 *   - 特別加入制度（中小事業主向け）も、従業員を雇用していることが要件のため、
 *     一人法人（役員のみ）では利用不可
 *   - 条件: (1) 雇用する労働者について保険関係が成立していること
 *           (2) 労働保険事務組合に事務処理を委託していること
 *   - 出典: 労働者災害補償保険法第33条、第35条
 *
 * ■ 子ども・子育て拠出金: 事業主が全額負担
 *   - 厚生年金保険の被保険者を使用する事業主に課される
 *   - 標準報酬月額・標準賞与額 × 0.36%
 *   - 被保険者の負担はなし
 *   - 一人法人でも厚生年金に加入していれば負担義務あり
 *
 * ■ 損金算入:
 *   - 事業主負担分の社会保険料は全額が法人の損金（経費）となる
 *   - 法定福利費として処理
 *   - 被保険者負担分は個人の社会保険料控除として所得控除の対象
 */
type OnePersonCorpInsuranceStatus = {
  healthInsurance: "mandatory"; // 加入強制
  pensionInsurance: "mandatory"; // 加入強制
  employmentInsurance: "not_applicable"; // 適用外
  workersCompInsurance: "not_applicable"; // 適用外（特別加入も不可）
  childCareContribution: "employer_only"; // 事業主全額負担
};

// =============================================================================
// 8. 計算例
// =============================================================================

/*
 * ========================================================================
 * 例1: 月額報酬50万円、賞与なし、40歳未満
 * ========================================================================
 *
 * ■ 標準報酬月額の特定:
 *   報酬月額 500,000円 → 485,000以上515,000未満
 *   健保: 第30級 500,000円
 *   厚年: 第27級 500,000円
 *
 * ■ 月額保険料:
 *
 *   健康保険料 (9.91%):
 *     全額: 500,000 × 0.0991 = 49,550円
 *     被保険者: 500,000 × 0.04955 = 24,775円
 *     事業主:   49,550 - 24,775 = 24,775円
 *
 *   介護保険料: なし（40歳未満）
 *
 *   厚生年金保険料 (18.3%):
 *     全額: 500,000 × 0.183 = 91,500円
 *     被保険者: 500,000 × 0.0915 = 45,750円
 *     事業主:   91,500 - 45,750 = 45,750円
 *
 *   子ども・子育て拠出金 (0.36%):
 *     事業主: 500,000 × 0.0036 = 1,800円
 *
 *   月額合計:
 *     被保険者負担: 24,775 + 45,750 = 70,525円
 *     事業主負担:   24,775 + 45,750 + 1,800 = 72,325円
 *     合計:         142,850円
 *
 * ■ 年額合計（賞与なし）:
 *     被保険者負担: 70,525 × 12 = 846,300円
 *     事業主負担:   72,325 × 12 = 867,900円
 *     合計:         1,714,200円
 *
 * ■ 社会保険料控除（被保険者負担の年額）: 846,300円
 *
 * ========================================================================
 * 例2: 月額報酬80万円、賞与200万円（年1回）、45歳
 * ========================================================================
 *
 * ■ 標準報酬月額の特定:
 *   報酬月額 800,000円 → 770,000以上810,000未満
 *   健保: 第39級 790,000円
 *   厚年: 第32級 650,000円（上限）
 *
 * ■ 月額保険料:
 *
 *   健康保険料 (9.91%):
 *     全額: 790,000 × 0.0991 = 78,289円
 *     被保険者: 790,000 × 0.04955 = 39,144.5 → 39,144円（50銭以下切捨て）
 *     事業主:   78,289 - 39,144 = 39,145円
 *
 *   介護保険料 (1.59%):
 *     全額: 790,000 × 0.0159 = 12,561円
 *     被保険者: 790,000 × 0.00795 = 6,280.5 → 6,280円（50銭以下切捨て）
 *     事業主:   12,561 - 6,280 = 6,281円
 *
 *   厚生年金保険料 (18.3%):
 *     全額: 650,000 × 0.183 = 118,950円
 *     被保険者: 650,000 × 0.0915 = 59,475円
 *     事業主:   118,950 - 59,475 = 59,475円
 *
 *   子ども・子育て拠出金 (0.36%):
 *     事業主: 650,000 × 0.0036 = 2,340円
 *
 *   月額合計:
 *     被保険者負担: 39,144 + 6,280 + 59,475 = 104,899円
 *     事業主負担:   39,145 + 6,281 + 59,475 + 2,340 = 107,241円
 *     合計:         212,140円
 *
 * ■ 賞与保険料:
 *
 *   標準賞与額: 2,000,000円（1,000円未満切捨て → 2,000,000円）
 *
 *   健康保険に適用される標準賞与額: 2,000,000円
 *     （年度累計573万円の上限内）
 *   厚生年金に適用される標準賞与額: 1,500,000円
 *     （1回あたり150万円の上限が適用される）
 *
 *   健康保険料:
 *     全額: 2,000,000 × 0.0991 = 198,200円
 *     被保険者: 2,000,000 × 0.04955 = 99,100円
 *     事業主:   198,200 - 99,100 = 99,100円
 *
 *   介護保険料:
 *     全額: 2,000,000 × 0.0159 = 31,800円
 *     被保険者: 2,000,000 × 0.00795 = 15,900円
 *     事業主:   31,800 - 15,900 = 15,900円
 *
 *   厚生年金保険料（標準賞与額 1,500,000円で計算）:
 *     全額: 1,500,000 × 0.183 = 274,500円
 *     被保険者: 1,500,000 × 0.0915 = 137,250円
 *     事業主:   274,500 - 137,250 = 137,250円
 *
 *   子ども・子育て拠出金（標準賞与額 1,500,000円で計算）:
 *     事業主: 1,500,000 × 0.0036 = 5,400円
 *
 *   賞与合計:
 *     被保険者負担: 99,100 + 15,900 + 137,250 = 252,250円
 *     事業主負担:   99,100 + 15,900 + 137,250 + 5,400 = 257,650円
 *     合計:         509,900円
 *
 * ■ 年額合計:
 *     被保険者負担: 104,899 × 12 + 252,250 = 1,511,038円
 *     事業主負担:   107,241 × 12 + 257,650 = 1,544,542円
 *     合計:         3,055,580円
 *
 * ■ 社会保険料控除（被保険者負担の年額）: 1,511,038円
 *
 * ========================================================================
 * 例3: 月額報酬100万円、賞与500万円（年1回）、38歳
 * ========================================================================
 *
 * ■ 標準報酬月額の特定:
 *   報酬月額 1,000,000円 → 955,000以上1,005,000未満
 *   健保: 第43級 980,000円
 *   厚年: 第32級 650,000円（上限）
 *
 * ■ 月額保険料:
 *
 *   健康保険料 (9.91%):
 *     全額: 980,000 × 0.0991 = 97,118円
 *     被保険者: 980,000 × 0.04955 = 48,559円
 *     事業主:   97,118 - 48,559 = 48,559円
 *
 *   介護保険料: なし（38歳 < 40歳）
 *
 *   厚生年金保険料 (18.3%):
 *     全額: 650,000 × 0.183 = 118,950円
 *     被保険者: 650,000 × 0.0915 = 59,475円
 *     事業主:   118,950 - 59,475 = 59,475円
 *
 *   子ども・子育て拠出金 (0.36%):
 *     事業主: 650,000 × 0.0036 = 2,340円
 *
 *   月額合計:
 *     被保険者負担: 48,559 + 59,475 = 108,034円
 *     事業主負担:   48,559 + 59,475 + 2,340 = 110,374円
 *     合計:         218,408円
 *
 * ■ 賞与保険料:
 *
 *   標準賞与額: 5,000,000円（1,000円未満切捨て → 5,000,000円）
 *
 *   健康保険に適用される標準賞与額: 5,000,000円
 *     （年度累計573万円の上限内: 500万 < 573万）
 *   厚生年金に適用される標準賞与額: 1,500,000円
 *     （1回あたり150万円上限。500万のうち350万は厚年の保険料計算対象外）
 *
 *   健康保険料:
 *     全額: 5,000,000 × 0.0991 = 495,500円
 *     被保険者: 5,000,000 × 0.04955 = 247,750円
 *     事業主:   495,500 - 247,750 = 247,750円
 *
 *   介護保険料: なし（38歳）
 *
 *   厚生年金保険料（標準賞与額 1,500,000円で計算）:
 *     全額: 1,500,000 × 0.183 = 274,500円
 *     被保険者: 1,500,000 × 0.0915 = 137,250円
 *     事業主:   274,500 - 137,250 = 137,250円
 *
 *   子ども・子育て拠出金:
 *     事業主: 1,500,000 × 0.0036 = 5,400円
 *
 *   賞与合計:
 *     被保険者負担: 247,750 + 137,250 = 385,000円
 *     事業主負担:   247,750 + 137,250 + 5,400 = 390,400円
 *     合計:         775,400円
 *
 * ■ 年額合計:
 *     被保険者負担: 108,034 × 12 + 385,000 = 1,681,408円
 *     事業主負担:   110,374 × 12 + 390,400 = 1,714,888円
 *     合計:         3,396,296円
 *
 * ■ 社会保険料控除（被保険者負担の年額）: 1,681,408円
 */

// =============================================================================
// 9. エッジケースと注意点
// =============================================================================

/**
 * ■ 標準報酬月額の上限を超える報酬の場合:
 *   - 健康保険: 報酬月額1,355,000円以上 → 第50級 1,390,000円が上限
 *     例: 月額200万円でも、健保の標準報酬月額は1,390,000円
 *   - 厚生年金: 報酬月額635,000円以上 → 第32級 650,000円が上限
 *     例: 月額200万円でも、厚年の標準報酬月額は650,000円
 *   → 高額報酬者は厚生年金の保険料に上限があるため、報酬を上げても
 *     厚生年金の保険料は増えない（健保は増える余地がある）
 *
 * ■ 賞与の上限を超える場合:
 *   - 健康保険: 年度累計573万円超過分は標準賞与額0円
 *     例: 年2回 400万円ずつ支給 → 1回目400万 + 2回目173万 = 573万
 *         2回目の残り227万は健保の保険料計算対象外
 *   - 厚生年金: 1回150万円超過分は標準賞与額から除外
 *     例: 1回500万円支給 → 厚年は150万で計算、350万は対象外
 *   → 高額賞与は厚年の保険料が頭打ちになるため、月額を下げて賞与を
 *     増やす「社会保険料最適化」のスキームが議論されることがある
 *     （ただし税務リスク・将来年金額の減少に注意）
 *
 * ■ 社会保険料は法人の損金（経費）:
 *   - 事業主負担分: 法定福利費として全額損金算入
 *   - 被保険者負担分: 個人の社会保険料控除（所得控除）
 *   - 一人法人では、個人負担 + 法人負担 = 実質的に全額が法人から支出
 *     → 法人税と個人の所得税・住民税の両方で節税効果がある
 *
 * ■ 役員報酬を変更した場合の随時改定:
 *   条件（3つ全てを満たすこと）:
 *   1. 固定的賃金の変動（役員報酬の改定）があった
 *   2. 変動後3か月の報酬平均と現在の標準報酬月額に2等級以上の差
 *   3. 3か月とも支払基礎日数17日以上（役員は常に該当）
 *
 *   一人法人の定期同額給与の場合:
 *   - 毎月固定額なので、変動後の3か月平均 = 新しい月額報酬
 *   - 2等級以上変動すれば、変更月から4か月目に改定
 *   - 例: 4月に報酬改定した場合、4月・5月・6月の3か月平均で判定
 *         → 7月から新しい標準報酬月額が適用
 *   - ただし、7月の定時決定（算定基礎届）の対象期間と重なるため、
 *     実質的には定時決定で9月に再度改定される場合もある
 *
 * ■ 役員報酬ゼロの場合:
 *   - 社会保険に加入できない（保険料を徴収する基礎がない）
 *   - 国民健康保険・国民年金に加入する必要がある
 *
 * ■ 役員報酬が極端に低い場合:
 *   - 最低等級（健保: 58,000円、厚年: 88,000円）で算定
 *   - ただし、保険料の天引きができないほど低額の場合は実務上問題あり
 *   - 一般的には、最低限の社会保険料（健保第1級相当）以上の報酬設定が必要
 */

// =============================================================================
// 10. 保険料率の設定型定義（都道府県対応用）
// =============================================================================

/**
 * 都道府県別の保険料率設定
 * 実装時に複数の都道府県に対応する場合のインターフェース
 */
interface PrefectureInsuranceRates {
  /** 都道府県コード (01-47) */
  prefectureCode: string;
  /** 都道府県名 */
  prefectureName: string;
  /** 適用年度 */
  fiscalYear: number;
  /** 健康保険料率（全額） */
  healthInsuranceRate: number;
  /** 介護保険料率（全額、全国一律） */
  nursingCareRate: number;
  /** 厚生年金保険料率（全額、全国一律） */
  pensionRate: number;
  /** 子ども・子育て拠出金率（全国一律） */
  childCareContributionRate: number;
}

const TOKYO_R7_RATES: PrefectureInsuranceRates = {
  prefectureCode: "13",
  prefectureName: "東京都",
  fiscalYear: 2025,
  healthInsuranceRate: 0.0991,
  nursingCareRate: 0.0159,
  pensionRate: 0.183,
  childCareContributionRate: 0.0036,
};

// =============================================================================
// 11. 令和8年度以降の注意事項
// =============================================================================

/**
 * 子ども・子育て支援金制度（令和8年度〜）
 *
 * 出典: こども家庭庁 子ども・子育て支援金制度について
 * https://www.mhlw.go.jp/content/12401000/001228302.pdf
 *
 * 令和8年度から、既存の「子ども・子育て拠出金」に加えて、
 * 医療保険料と合わせて徴収される「子ども・子育て支援金」が新設される予定。
 * これにより、令和8年度以降は保険料の構造が変わる可能性がある。
 *
 * 令和7年度時点ではまだ施行前のため、本設計には含めない。
 * 令和8年度の実装時に最新情報を確認する必要がある。
 */
