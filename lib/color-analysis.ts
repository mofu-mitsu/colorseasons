// lib/color-analysis.ts
// RGB -> Linear sRGB -> OKLab -> OKLCH 色空間変換およびパーソナルカラー分析アルゴリズム

export interface RGB {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

export interface OKLCH {
  l: number; // Lightness 0.0 - 1.0
  c: number; // Chroma 0.0 - ~0.4
  h: number; // Hue angle 0.0 - 360.0 degrees
}

export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonInfo {
  id: SeasonType;
  name: string;
  nameEn: string;
  subTitle: string;
  undertone: 'イエローベース (イエベ)' | 'ブルーベース (ブルベ)';
  shortUndertone: 'イエベ' | 'ブルベ';
  tone: 'Bright / Warm' | 'Muted / Cool' | 'Deep / Warm' | 'Vivid / Cool';
  catchphrase: string;
  atmosphere: string;
  description: string;
  handFeatures: string;
  primaryColor: string;
  accentColor: string;
  bgGradient: string;
  cardBg: string;
  textColor: string;
  borderColor: string;
  keywords: string[];
  palette: {
    name: string;
    hex: string;
    description: string;
    category: 'base' | 'main' | 'accent';
  }[];
  ngColorAdvice: {
    colorName: string;
    reason: string;
    workaround: string;
  };
  rakutenQueries: {
    label: string;
    keyword: string;
    category: 'fashion' | 'cosmetics' | 'accessory';
  }[];
  riekoComment: string;
}

// sRGB (0-255) から OKLCH への高精度変換
export function rgbToOklch(rgb: RGB): OKLCH {
  // 1. sRGB 0-255 -> 0-1
  const rNorm = rgb.r / 255;
  const gNorm = rgb.g / 255;
  const bNorm = rgb.b / 255;

  // 2. Linear sRGB 変換 (ガンマ補正解除)
  const toLinear = (c: number) => {
    return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  };
  const rLin = toLinear(rNorm);
  const gLin = toLinear(gNorm);
  const bLin = toLinear(bNorm);

  // 3. Linear sRGB -> LMS (Cone Response Matrix for OKLab)
  const l_ = Math.cbrt(0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin);
  const m_ = Math.cbrt(0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin);
  const s_ = Math.cbrt(0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin);

  // 4. LMS -> OKLab (L, a, b)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // 5. OKLab -> OKLCH
  const C = Math.sqrt(a * a + b * b);
  let hRad = Math.atan2(b, a);
  let hDeg = (hRad * 180) / Math.PI;
  if (hDeg < 0) {
    hDeg += 360;
  }

  return {
    l: Math.max(0, Math.min(1, L)),
    c: Math.max(0, C),
    h: hDeg,
  };
}

// 簡易ホワイトバランスキャリブレーション
export function calibrateRGB(measuredRGB: RGB, referenceWhite: RGB): RGB {
  // referenceWhite が純白(255,255,255)に対してどれだけズレているかを補正
  const rScale = referenceWhite.r > 20 ? 255 / referenceWhite.r : 1;
  const gScale = referenceWhite.g > 20 ? 255 / referenceWhite.g : 1;
  const bScale = referenceWhite.b > 20 ? 255 / referenceWhite.b : 1;

  return {
    r: Math.min(255, Math.max(0, Math.round(measuredRGB.r * rScale))),
    g: Math.min(255, Math.max(0, Math.round(measuredRGB.g * gScale))),
    b: Math.min(255, Math.max(0, Math.round(measuredRGB.b * bScale))),
  };
}

// RGBからHexコードへ
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

// 質問回答による補助スコアの型
export interface QuestionnaireAnswers {
  q1?: 'coral' | 'rose'; // ピンク系
  q2?: 'ivory' | 'white'; // 白系
  q3?: 'gold' | 'silver'; // アクセサリ
  q4?: 'warm_neutral' | 'cool_neutral'; // ベーシック
}

export interface AnalysisResult {
  primarySeason: SeasonType;
  secondarySeason: SeasonType;
  scores: Record<SeasonType, number>; // 0 - 100%
  dominantRGB: RGB;
  oklch: OKLCH;
  skinDescription: string;
  isCalibrated: boolean;
  lightingQuality: 'good' | 'warm_tint' | 'cool_tint' | 'dim';
}

// 肌の色彩特性と4シーズンのマッチングアルゴリズム
export function analyzeSkinColor(
  rgb: RGB,
  answers?: QuestionnaireAnswers,
  isCalibrated: boolean = false
): AnalysisResult {
  const oklch = rgbToOklch(rgb);
  const { l, c, h } = oklch;

  // 照明チェック
  let lightingQuality: 'good' | 'warm_tint' | 'cool_tint' | 'dim' = 'good';
  if (l < 0.45) {
    lightingQuality = 'dim';
  } else if (rgb.r > rgb.b + 60 && rgb.g > rgb.b + 40) {
    lightingQuality = 'warm_tint';
  } else if (rgb.b > rgb.g + 5) {
    lightingQuality = 'cool_tint';
  }

  // シーズン基準スコアの初期値
  let springScore = 20;
  let summerScore = 20;
  let autumnScore = 20;
  let winterScore = 20;

  // 1. ベースカラー判定（イエローベース vs ブルーベース）
  // H: 色相角 (通常人間の肌は 25°〜70°)
  // H >= 46°: 明確な黄み・ゴールデン (イエベ春・秋)
  // H < 44°: ピンク・赤み・青み (ブルベ夏・冬)
  const isWarm = h >= 46.0;
  const isCool = h < 44.0;
  const isNeutral = !isWarm && !isCool;

  if (isWarm) {
    // イエローベース優勢
    // 春 (高明度・澄んだツヤ) vs 秋 (中低明度・マット・深み)
    if (l >= 0.70) {
      // 明るいイエベ → 春 (Spring)
      springScore += 45;
      autumnScore += 20;
      summerScore += 8;
      winterScore += 5;
    } else {
      // 落ち着いた・深みのあるイエベ → 秋 (Autumn)
      autumnScore += 48;
      springScore += 18;
      winterScore += 10;
      summerScore += 6;
    }

    // 彩度による補正
    if (c >= 0.085) {
      springScore += 8; // 華やか・澄んだ
    } else {
      autumnScore += 8; // スモーキー・落ち着き
    }
  } else if (isCool) {
    // ブルーベース優勢
    // 夏 (ソフト・パウダリー・淡い) vs 冬 (ハイコントラスト・鮮やか血色・クリア)
    // 彩度 C が高め (C >= 0.080) または赤みコントラストが強い場合は冬！
    // 彩度 C が穏やか (C < 0.080) で中高明度の場合は夏！
    if (c >= 0.080 || (l < 0.66 && h < 38) || (l >= 0.76 && h < 33)) {
      // コントラスト・シャープ・鮮烈血色 → 冬 (Winter)
      winterScore += 48;
      summerScore += 20;
      autumnScore += 10;
      springScore += 6;
    } else {
      // やわらか・くすみニュアンス・パウダリー → 夏 (Summer)
      summerScore += 46;
      winterScore += 20;
      springScore += 10;
      autumnScore += 6;
    }
  } else {
    // ニュートラル（44°〜46°）
    if (l >= 0.72) {
      springScore += 25;
      summerScore += 25;
      winterScore += 15;
      autumnScore += 15;
    } else {
      autumnScore += 25;
      winterScore += 22;
      summerScore += 18;
      springScore += 15;
    }
  }

  // 2. 任意アンケート回答の加算 (回答がある場合のみ精密補正)
  if (answers) {
    if (answers.q1 === 'rose') {
      summerScore += 6;
      winterScore += 6;
    } else if (answers.q1 === 'coral') {
      springScore += 6;
      autumnScore += 6;
    }

    if (answers.q2 === 'white') {
      winterScore += 7;
      summerScore += 4;
    } else if (answers.q2 === 'ivory') {
      springScore += 6;
      autumnScore += 7;
    }

    if (answers.q3 === 'silver') {
      summerScore += 5;
      winterScore += 6;
    } else if (answers.q3 === 'gold') {
      springScore += 6;
      autumnScore += 6;
    }

    if (answers.q4 === 'cool_neutral') {
      summerScore += 5;
      winterScore += 6;
    } else if (answers.q4 === 'warm_neutral') {
      springScore += 5;
      autumnScore += 6;
    }
  }

  // 総計の正規化 (合計100%にする)
  const total = springScore + summerScore + autumnScore + winterScore;
  const rawPercentages = {
    spring: (springScore / total) * 100,
    summer: (summerScore / total) * 100,
    autumn: (autumnScore / total) * 100,
    winter: (winterScore / total) * 100,
  };

  // ソートして順位づけ
  const sorted = (Object.entries(rawPercentages) as [SeasonType, number][]).sort(
    (a, b) => b[1] - a[1]
  );

  const primarySeason = sorted[0][0];
  const secondarySeason = sorted[1][0];

  // 整数の%に丸め (合計100%に調整)
  const roundedScores: Record<SeasonType, number> = {
    spring: Math.round(rawPercentages.spring),
    summer: Math.round(rawPercentages.summer),
    autumn: Math.round(rawPercentages.autumn),
    winter: Math.round(rawPercentages.winter),
  };
  const diff = 100 - (roundedScores.spring + roundedScores.summer + roundedScores.autumn + roundedScores.winter);
  roundedScores[primarySeason] += diff;

  // 肌色特徴の言葉づかい
  let skinDescription = '';
  if (primarySeason === 'spring') {
    skinDescription = 'ふんわり明るいアイボリー〜ピーチ系。春の光を浴びたような温かみと透明感のあるトーンです。';
  } else if (primarySeason === 'summer') {
    skinDescription = '繊細で涼やかなピンクベージュ系。赤みがほんのり差すパウダリーで透明感あふれる肌トーンです。';
  } else if (primarySeason === 'autumn') {
    skinDescription = '落ち着いた温もりを感じるゴールデンオークル〜テラコッタ系。陶器のようにシックな肌トーンです。';
  } else {
    skinDescription = '冴えた赤み・青みコントラストを持つクリアなクールトーン。凛とした存在感のある肌色です。';
  }

  return {
    primarySeason,
    secondarySeason,
    scores: roundedScores,
    dominantRGB: rgb,
    oklch,
    skinDescription,
    isCalibrated,
    lightingQuality,
  };
}

// 4つの季節のマスターデータ
export const SEASONS_DATA: Record<SeasonType, SeasonInfo> = {
  spring: {
    id: 'spring',
    name: '春 (Spring)',
    nameEn: 'SPRING',
    subTitle: '月明かりに咲く桜と若葉',
    undertone: 'イエローベース (イエベ)',
    shortUndertone: 'イエベ',
    tone: 'Bright / Warm',
    catchphrase: '明るくみずみずしい、春風と光を纏う華やかさ',
    atmosphere: '🌸 夜桜に月光が差し、ほんのり黄金色の光を反射する花びらのような、柔らかく澄んだ多幸感。',
    description: 'イエベ春タイプは、春に咲く花々や新緑のように、明るく鮮やかで澄んだ暖色が抜群に似合います。身につけると表情が生き生きと輝き、パッと華やぐようなオーラを引き出します。',
    handFeatures: '手の甲・手のひらにほんのり黄みを含んだピーチベージュ。血色感がよく、ツヤと明るさがある肌質です。',
    primaryColor: '#F472B6', // 桜ピンク
    accentColor: '#FACC15', // 月光イエロー
    bgGradient: 'from-amber-50 via-rose-50 to-emerald-50',
    cardBg: 'bg-gradient-to-br from-pink-50/90 via-amber-50/80 to-emerald-50/90',
    textColor: 'text-amber-950',
    borderColor: 'border-pink-300',
    keywords: ['コーラルピンク', 'ミモザイエロー', 'アップルグリーン', 'アイボリー', 'ピーチ', 'アクアブルー'],
    palette: [
      { name: 'サクラピンク (桜月)', hex: '#FFB7C5', description: '月夜に優しく浮かぶソメイヨシノの淡いピンク', category: 'main' },
      { name: 'コーラルピンク', hex: '#F88379', description: '血色感をグッと高める温かいサンゴ色', category: 'main' },
      { name: 'ムーンライトイエロー', hex: '#FFE58F', description: '夜桜を照らす柔らかな月光のレモンゴールド', category: 'accent' },
      { name: '若葉グリーン (リーフ)', hex: '#A8D5BA', description: '芽吹いたばかりのみずみずしい新緑', category: 'main' },
      { name: 'アイボリーホワイト', hex: '#FFFFF0', description: '肌をふんわり明るく見せる温かな白', category: 'base' },
      { name: 'ピーチメルバ', hex: '#FFCBA4', description: '手肌に極上の透明感を与える桃色', category: 'main' },
      { name: 'アプリコット', hex: '#FBCEB1', description: '華やかで健康的な明るいオレンジ', category: 'main' },
      { name: 'ターコイズスプリング', hex: '#40E0D0', description: '春の澄んだ空のような明るい青緑', category: 'accent' },
      { name: 'ハニーゴールド', hex: '#E6BE8A', description: 'アクセサリーや小物に最適なツヤ感ゴールド', category: 'accent' },
      { name: 'ライトキャメル', hex: '#C19A6B', description: '春の装いを上品に引き締めるベースカラー', category: 'base' },
      { name: 'ポピーレッド', hex: '#E35335', description: '生き生きとしたエネルギーをプラスする赤', category: 'accent' },
      { name: 'ウォームベージュ', hex: '#F5F5DC', description: 'どんな服にも自然に馴染む軽やかな定番色', category: 'base' },
    ],
    ngColorAdvice: {
      colorName: '重いブラック・暗いチャコールグレー',
      reason: '顔色や手肌がくすんで見えたり、服の重さに負けてしまうことがあります。',
      workaround: '黒の代わりに「ライトキャメル」や「ミルクティーベージュ」、または透け感のある素材を選ぶと軽やかに！',
    },
    rakutenQueries: [
      { label: 'コーラルピンク ワンピース', keyword: 'コーラルピンク ワンピース 春', category: 'fashion' },
      { label: 'アイボリー カーディガン', keyword: 'アイボリー カーディガン', category: 'fashion' },
      { label: 'ピーチ系 リップ・チーク', keyword: 'コーラル ピーチ リップ コスメ', category: 'cosmetics' },
      { label: 'ゴールド アクセサリー', keyword: 'イエローゴールド 華奢 ネックレス', category: 'accessory' },
    ],
    riekoComment: '春風のやさしい暖かさを感じるお色味ですね。コーラルやアイボリーを合わせると、パッと光が差したように明るく引き立ちますよ。',
  },
  summer: {
    id: 'summer',
    name: '夏 (Summer)',
    nameEn: 'SUMMER',
    subTitle: '水面に夕暮れが溶けていく',
    undertone: 'ブルーベース (ブルベ)',
    shortUndertone: 'ブルベ',
    tone: 'Muted / Cool',
    catchphrase: 'サイダーの泡と夕暮れの紫、涼やかで上品な透明感',
    atmosphere: '🫧 青空と波打ち際、サイダーの涼しげな泡、そして水面に溶けていく夕暮れの青紫。儚く洗練されたやわらかさ。',
    description: 'ブルベ夏タイプは、初夏の紫陽花や夕暮れの海辺のように、青みを含んだソフトで穏やかなトーンがとてもよく映えます。くすみパステルや涼やかなニュアンスカラーが、肌の透明感をどこまでも引き立てます。',
    handFeatures: '手の甲・手のひらに赤み・ピンク味があり、血管が青〜紫に見えやすい涼やかで繊細な肌トーンです。',
    primaryColor: '#38BDF8', // サイダーブルー
    accentColor: '#A78BFA', // 夕暮れラベンダー
    bgGradient: 'from-sky-50 via-indigo-50/50 to-teal-50',
    cardBg: 'bg-gradient-to-br from-sky-50/90 via-purple-50/80 to-teal-50/90',
    textColor: 'text-slate-900',
    borderColor: 'border-sky-300',
    keywords: ['アイスブルー', 'ラベンダー', 'ローズピンク', 'ソフトホワイト', 'ミントグリーン', 'ブルーグレー'],
    palette: [
      { name: 'ソーダブルー (サイダーの泡)', hex: '#89CFF0', description: '弾けるサイダーのような涼やかで清涼感あふれる水色', category: 'main' },
      { name: 'トワイライトラベンダー (夕暮れの空)', hex: '#BDB0D0', description: '夏の夕暮れ時に空が紫に染まる一瞬を切り取った色', category: 'main' },
      { name: 'ローズピンク', hex: '#FF66CC', description: '青みを含んだソフトでフェミニンな華やぎピンク', category: 'accent' },
      { name: 'ミントグリーン (海風)', hex: '#98FF98', description: '爽快で清潔感ある淡いグリーン', category: 'main' },
      { name: 'ミルキーホワイト', hex: '#F8F9FA', description: '純白より柔らかく、肌に溶け込むミルキーな白', category: 'base' },
      { name: 'ブルーグレー', hex: '#6699CC', description: '夏の装いを一気に都会的で上品に格上げするニュアンス色', category: 'base' },
      { name: 'オーキッド (薄紫の宵)', hex: '#DA70D6', description: '上品さと優雅さを引き出すエレガントな蘭色', category: 'main' },
      { name: 'アイスグレー', hex: '#DCDCDC', description: 'シルバーやプラチナと好相性の澄んだベースカラー', category: 'base' },
      { name: 'ココアブラウン', hex: '#7D5C58', description: '黄みを抑えた、夏タイプにぴったりのシックな茶色', category: 'base' },
      { name: 'スイカレッド (ウォーターメロン)', hex: '#FC6C85', description: '涼やかさを失わずに血色感を灯す夏の赤', category: 'accent' },
      { name: 'シアーネイビー', hex: '#2A52BE', description: '黒よりも軽やかで、凛とした知性を演出する紺色', category: 'base' },
      { name: 'プラチナシルバー', hex: '#E5E4E2', description: 'アクセサリーやラメに最高に映える涼感シルバー', category: 'accent' },
    ],
    ngColorAdvice: {
      colorName: '強い黄みのマスタード・オレンジ',
      reason: '手肌や顔色が黄ぐすみして見えたり、本来の涼やかな透明感が隠れてしまうことがあります。',
      workaround: 'オレンジの代わりに「ローズピンク」や「ラズベリー」、黄色なら「レモンイエロー」を取り入れるのが正解！',
    },
    rakutenQueries: [
      { label: 'ラベンダー ワンピース', keyword: 'ラベンダー ワンピース 夏', category: 'fashion' },
      { label: 'ブルーグレー ニット', keyword: 'ブルーグレー サマーニット', category: 'fashion' },
      { label: '青みローズ リップ', keyword: 'ブルベ夏 ローズピンク リップ', category: 'cosmetics' },
      { label: 'シルバー アクセサリー', keyword: 'シルバー925 プラチナ ネックレス', category: 'accessory' },
    ],
    riekoComment: '水面に夕暮れがそっと溶けていくような、涼やかで澄んだお色味ですね。わたしも大好きな系統です。ラベンダーやブルーグレーを合わせると格別にお似合いですよ。',
  },
  autumn: {
    id: 'autumn',
    name: '秋 (Autumn)',
    nameEn: 'AUTUMN',
    subTitle: '水彩で滲む紅葉と豊かな実り',
    undertone: 'イエローベース (イエベ)',
    shortUndertone: 'イエベ',
    tone: 'Deep / Warm',
    catchphrase: '深く温かいアースカラー、絵画のように重厚な気品',
    atmosphere: '🍂 水彩絵の具を水に落としたように、赤や橙がじわっと紙に滲む紅葉。温もりと落ち着きのある絵本の世界。',
    description: 'イエベ秋タイプは、紅葉や豊かな大地、熟した果実のように深みと温かみのあるこっくりとしたリッチカラーが非常に似合います。大人っぽく洗練された落ち着きとゴージャス感を醸し出します。',
    handFeatures: '手の甲・手のひらに温かみのあるゴールデンベージュやオークル系。しっとりと落ち着いた大人びた肌質感です。',
    primaryColor: '#D97706', // 琥珀アンバー
    accentColor: '#B91C1C', // 紅葉レッド
    bgGradient: 'from-amber-50 via-orange-50/60 to-stone-100',
    cardBg: 'bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-stone-100/90',
    textColor: 'text-amber-950',
    borderColor: 'border-amber-400',
    keywords: ['テラコッタ', 'マスタード', 'オリーブグリーン', 'キャメル', 'カーキ', 'ボルドー'],
    palette: [
      { name: 'テラコッタ (滲む素焼き)', hex: '#D45B34', description: '秋のぬくもりを凝縮した、手肌を艶やかに魅せるレンガ色', category: 'main' },
      { name: 'マスタードゴールド (紅葉銀杏)', hex: '#DCA134', description: '黄金色に染まる銀杏並木のような深みのあるイエロー', category: 'main' },
      { name: 'オリーブモス (深緑の森)', hex: '#556B2F', description: 'シックで大人びた印象を作る絶妙なグリーン', category: 'base' },
      { name: 'バーントアンバー (焼き栗)', hex: '#8A3324', description: '水彩画の影のように奥深いブラウンレッド', category: 'accent' },
      { name: 'リッチキャメル', hex: '#C19A6B', description: '秋タイプのリッチな質感を最高に活かす王道カラー', category: 'base' },
      { name: 'パンプキンオレンジ', hex: '#FF7518', description: 'こっくりと熟した果実のような温かな橙', category: 'accent' },
      { name: 'カーキベージュ', hex: '#8F8B66', description: 'こなれ感とナチュラルな気品を両立する万能色', category: 'base' },
      { name: 'ディープフォレスト', hex: '#224229', description: '深呼吸したくなるような静寂の深い緑', category: 'base' },
      { name: 'アンティークゴールド', hex: '#CFB53B', description: '燻したようなヴィンテージ調の重厚な輝き', category: 'accent' },
      { name: 'ウォームホワイト (生成り)', hex: '#EAE6DF', description: '漂白されていない自然な温もりのオフホワイト', category: 'base' },
      { name: 'サーモンベージュ', hex: '#FF8C69', description: '肌にやさしく馴染む落ち着いた血色カラー', category: 'main' },
      { name: 'ダークチョコレート', hex: '#3D1C02', description: '黒よりも優しく、洗練されたコントラストを生む締め色', category: 'base' },
    ],
    ngColorAdvice: {
      colorName: '青みの強いパステルカラー・青みの青',
      reason: '肌の温かみと反発して、顔色や手元が血色を失って見えてしまうことがあります。',
      workaround: '青を使いたいときは「ピーコックブルー（緑みの深青）」や「ティールグリーン」を選ぶと抜群に垢抜けます！',
    },
    rakutenQueries: [
      { label: 'テラコッタ ニット', keyword: 'テラコッタ ニット 秋', category: 'fashion' },
      { label: 'キャメル ロングスカート', keyword: 'キャメル スカート 秋冬', category: 'fashion' },
      { label: 'ブラウン系 リップ・アイシャドウ', keyword: 'イエベ秋 ブラウン テラコッタ リップ', category: 'cosmetics' },
      { label: 'アンティークゴールド アクセ', keyword: 'アンティークゴールド 真鍮 ピアス', category: 'accessory' },
    ],
    riekoComment: '水彩絵の具がじんわりと滲んだような、豊かな深みとぬくもりを感じますね。テラコッタやキャメルを羽織ると、陶器のような肌の美しさが際立ちます。',
  },
  winter: {
    id: 'winter',
    name: '冬 (Winter)',
    nameEn: 'WINTER',
    subTitle: '白銀と月明かりに凍る氷の花',
    undertone: 'ブルーベース (ブルベ)',
    shortUndertone: 'ブルベ',
    tone: 'Vivid / Cool',
    catchphrase: '鮮やかなコントラスト、凛とした白銀のドラマティック',
    atmosphere: '❄️ 白銀の夜、月光の中でひっそりと凍りついた薔薇と氷の結晶。研ぎ澄まされた静寂と圧倒的な存在感。',
    description: 'ブルベ冬タイプは、純白と漆黒、鮮やかな原色や極限まで淡いアイシーカラーなど、キリリと冴えたコントラストが最も似合います。シャープでモダン、凛とした圧倒的な魅力を放ちます。',
    handFeatures: '手の甲・手のひらに赤みまたは青みがあり、透き通るような白さやコントラストがはっきりした肌トーンです。',
    primaryColor: '#2563EB', // ロイヤルブルー
    accentColor: '#9333EA', // アイシーバイオレット
    bgGradient: 'from-slate-100 via-blue-50/50 to-indigo-50',
    cardBg: 'bg-gradient-to-br from-slate-100/90 via-blue-50/80 to-purple-50/90',
    textColor: 'text-slate-900',
    borderColor: 'border-blue-400',
    keywords: ['ロイヤルブルー', 'アイシーピンク', 'ピュアホワイト', 'ブラック', 'ワインレッド', 'シルバー'],
    palette: [
      { name: 'ロイヤルブルー (深海の青)', hex: '#1A4384', description: '白銀の雪景色に鮮烈に映える、高貴で冴えた青', category: 'main' },
      { name: 'アイシーローズ (凍った花)', hex: '#F0E6EF', description: '氷でコーティングされた花びらのように極限まで淡い冷光ピンク', category: 'main' },
      { name: 'ピュアホワイト (純白の雪)', hex: '#FFFFFF', description: '黄みのない、雪原そのもののクリアな真っ白', category: 'base' },
      { name: '漆黒 (ジェットブラック)', hex: '#0A0A0A', description: '冬タイプだからこそスタイリッシュに着こなせる絶対の黒', category: 'base' },
      { name: 'ルビーワイン (真冬の薔薇)', hex: '#722F37', description: 'ドラマティックで深みのある大人のディープレッド', category: 'accent' },
      { name: 'フューシャピンク', hex: '#FF007F', description: '視線を惹きつける鮮やかでクールなネオンピンク', category: 'accent' },
      { name: 'アイシーブルー (氷晶)', hex: '#D4F1F4', description: '清らかな氷のきらめきを連想させる極淡ブルー', category: 'base' },
      { name: 'エメラルドグリーン', hex: '#50C878', description: '宝石のように澄み渡った鮮やかな冷緑', category: 'main' },
      { name: 'ミッドナイトネイビー', hex: '#000080', description: '真夜中の静寂を纏う、気品ある濃紺', category: 'base' },
      { name: 'アイシーバイオレット', hex: '#D8D4E2', description: '涼やかで透明感あふれる極薄の紫', category: 'main' },
      { name: 'シルバーメタリック', hex: '#C0C0C0', description: '氷の結晶のように鋭く輝くプラチナシルバー', category: 'accent' },
      { name: 'マゼンタパープル', hex: '#9E0142', description: 'クールさと情熱を併せ持つ洗練のバイオレット', category: 'accent' },
    ],
    ngColorAdvice: {
      colorName: '黄みの強い濁ったアースカラー（くすんだカーキ・黄土色）',
      reason: 'せっかくのクリアな肌の透明感が霞んで見えたり、ぼんやりした印象になってしまうことがあります。',
      workaround: 'アースカラーの代わりに「チャコールグレー」や「ダークネイビー」を選ぶと、凛としたシャープさが際立ちます！',
    },
    rakutenQueries: [
      { label: 'ロイヤルブルー ニット', keyword: 'ロイヤルブルー ニット 冬', category: 'fashion' },
      { label: '純白 コート・ワンピース', keyword: 'ピュアホワイト コート', category: 'fashion' },
      { label: 'ワインレッド・ベリー リップ', keyword: 'ブルベ冬 ボルドー ワインレッド リップ', category: 'cosmetics' },
      { label: 'プラチナシルバー ジュエリー', keyword: 'プラチナ ダイヤモンド ネックレス 一粒', category: 'accessory' },
    ],
    riekoComment: '凍った花に月明かりが差し込むような、凛としたドラマティックなお色味ですね。純白やロイヤルブルーを身につけると、息を呑むような透明感が引き立ちますよ。',
  },
};
