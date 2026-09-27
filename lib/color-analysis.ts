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

export interface PaletteColorItem {
  name: string;
  hex: string;
  description: string;
  category: 'base' | 'main' | 'accent';
  coordPoint: string; // おすすめコーディネートのポイント
  bestMatch: string;  // ベスト相性アイテム・配色
}

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
  palette: PaletteColorItem[];
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

  // 2. ガンマ補正を解除して Linear sRGB に変換
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rLinear = toLinear(rNorm);
  const gLinear = toLinear(gNorm);
  const bLinear = toLinear(bNorm);

  // 3. Linear sRGB -> OKLab 行列変換
  const l =
    0.4122214708 * rLinear + 0.5363325363 * gLinear + 0.0514459929 * bLinear;
  const m =
    0.2119034982 * rLinear + 0.6806995451 * gLinear + 0.1073969566 * bLinear;
  const s =
    0.0883024619 * rLinear + 0.2817188376 * gLinear + 0.6299787005 * bLinear;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // 4. OKLab (L, a, b) -> OKLCH (L, C, H)
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
  const rScale = referenceWhite.r > 20 ? 255 / referenceWhite.r : 1;
  const gScale = referenceWhite.g > 20 ? 255 / referenceWhite.g : 1;
  const bScale = referenceWhite.b > 20 ? 255 / referenceWhite.b : 1;

  return {
    r: Math.min(255, Math.max(0, Math.round(measuredRGB.r * rScale))),
    g: Math.min(255, Math.max(0, Math.round(measuredRGB.g * gScale))),
    b: Math.min(255, Math.max(0, Math.round(measuredRGB.b * bScale))),
  };
}

/**
 * 陰・照度補正（スマート・シャドウコンペンセーション）
 * 影によって明度が落ち、室内光やセンサー特性で黄み・赤茶（イエベ方向）へ
 * 偽陽性シフトしてしまった肌色を、本来の自然光下での透明感肌色へと適正復元します。
 */
export function compensateShadowRGB(rgb: RGB): RGB {
  const oklch = rgbToOklch(rgb);
  const { l, c, h } = oklch;

  const shadowDepth = Math.max(0, Math.min(1, (0.75 - l) / 0.35));
  const targetL = Math.min(0.80, l + shadowDepth * 0.16 + 0.03);

  let targetH = h;
  if (h > 40 && h < 68) {
    targetH = Math.max(34, h - (shadowDepth * 7.5 + 4.0));
  }

  const targetC = Math.max(0.045, Math.min(0.11, c * 0.95));

  const hRad = (targetH * Math.PI) / 180;
  const a = targetC * Math.cos(hRad);
  const b = targetC * Math.sin(hRad);

  const l_ = targetL + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = targetL - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = targetL - 0.0894841775 * a - 1.291485548 * b;

  const L = l_ * l_ * l_;
  const M = m_ * m_ * m_;
  const S = s_ * s_ * s_;

  let linearR = +4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S;
  let linearG = -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S;
  let linearB = -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S;

  const srgb = (cLinear: number) => {
    const clamped = Math.max(0, Math.min(1, cLinear));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  return {
    r: Math.round(srgb(linearR) * 255),
    g: Math.round(srgb(linearG) * 255),
    b: Math.round(srgb(linearB) * 255),
  };
}

// RGBからHexコードへ
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

// 質問回答による補助スコアの型
export interface QuestionnaireAnswers {
  q1?: 'coral' | 'rose';
  q2?: 'ivory' | 'white';
  q3?: 'gold' | 'silver';
  q4?: 'warm_neutral' | 'cool_neutral';
}

export interface AnalysisResult {
  primarySeason: SeasonType;
  secondarySeason: SeasonType;
  scores: Record<SeasonType, number>;
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

  let springScore = 20;
  let summerScore = 20;
  let autumnScore = 20;
  let winterScore = 20;

  // 1. ベースカラー判定（イエローベース vs ブルーベース）
  // 【超重要】OKLCHの色相環 H (0°〜360°):
  // ・220°〜360°: 青・青紫・紫・マゼンタ (超明確なブルーベース！！)
  // ・0°〜48°: 赤・チェリー・ピンク・ローズ (ブルーベース〜ニュートラル)
  // ・52°〜110°: 黄色・ゴールデン・オークル (イエローベース)
  const rgDiff = Math.max(1, rgb.r - rgb.b);
  const gbDiff = Math.max(0, rgb.g - rgb.b);
  const yellowRatio = gbDiff / rgDiff;

  const isCoolHue = h >= 220.0 || h < 48.0;
  const isBlueRich = rgb.b >= rgb.g - 8;
  const isCool = isCoolHue || (h < 54.0 && yellowRatio < 0.39) || isBlueRich;

  const isWarm =
    (h >= 52.0 && h < 120.0 && rgb.g > rgb.b + 12) ||
    (h >= 50.0 && h < 100.0 && yellowRatio >= 0.42);

  if (isCool) {
    // ブルーベース優勢 (夏・冬)
    if (c >= 0.082 || (l < 0.65 && h < 38) || (l >= 0.77 && h < 32)) {
      winterScore += 48;
      summerScore += 24;
      springScore += 8;
      autumnScore += 6;
    } else {
      summerScore += 50;
      winterScore += 20;
      springScore += 10;
      autumnScore += 6;
    }
  } else if (isWarm) {
    // イエローベース優勢 (春・秋)
    if (l >= 0.70) {
      springScore += 48;
      autumnScore += 20;
      summerScore += 8;
      winterScore += 5;
    } else {
      autumnScore += 50;
      springScore += 18;
      winterScore += 10;
      summerScore += 6;
    }

    if (c >= 0.085) {
      springScore += 6;
    } else {
      autumnScore += 6;
    }
  } else {
    // ニュートラル
    if (l >= 0.70) {
      summerScore += 30;
      springScore += 26;
      winterScore += 16;
      autumnScore += 14;
    } else {
      autumnScore += 28;
      summerScore += 22;
      winterScore += 20;
      springScore += 16;
    }
  }

  // 2. 任意アンケート回答の加算
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

  // 総計の正規化
  const total = springScore + summerScore + autumnScore + winterScore;
  const rawPercentages = {
    spring: (springScore / total) * 100,
    summer: (summerScore / total) * 100,
    autumn: (autumnScore / total) * 100,
    winter: (winterScore / total) * 100,
  };

  const sorted = (Object.entries(rawPercentages) as [SeasonType, number][]).sort(
    (a, b) => b[1] - a[1]
  );

  const primarySeason = sorted[0][0];
  const secondarySeason = sorted[1][0];

  const roundedScores: Record<SeasonType, number> = {
    spring: Math.round(rawPercentages.spring),
    summer: Math.round(rawPercentages.summer),
    autumn: Math.round(rawPercentages.autumn),
    winter: Math.round(rawPercentages.winter),
  };
  const diff = 100 - (roundedScores.spring + roundedScores.summer + roundedScores.autumn + roundedScores.winter);
  roundedScores[primarySeason] += diff;

  let skinDescription = '';
  if (primarySeason === 'spring') {
    skinDescription = 'ふんわり明るいアイボリー〜ピーチ系。春の光を浴びたような温かみと透明感のあるトーンです。';
  } else if (primarySeason === 'summer') {
    skinDescription = '繊細で涼やかなピンクベージュ〜ソフトアイシー系。赤みがほんのり差すパウダリーで透明感あふれる肌トーンです。';
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
    primaryColor: '#F472B6',
    accentColor: '#FACC15',
    bgGradient: 'from-amber-50 via-rose-50 to-emerald-50',
    cardBg: 'bg-gradient-to-br from-pink-50/90 via-amber-50/80 to-emerald-50/90',
    textColor: 'text-amber-950',
    borderColor: 'border-pink-300',
    keywords: ['コーラルピンク', 'ミモザイエロー', 'アップルグリーン', 'アイボリー', 'ピーチ', 'アクアブルー'],
    palette: [
      {
        name: 'サクラピンク (桜月)',
        hex: '#FFB7C5',
        description: '月夜に優しく浮かぶソメイヨシノの淡いピンク',
        category: 'main',
        coordPoint: 'アイボリーのボトムスやゴールドアクセサリーと合わせると、愛らしく上品なお出かけスタイルに。デートや春のイベントに最適です。',
        bestMatch: 'アイボリー / ライトキャメル / パールゴールド',
      },
      {
        name: 'コーラルピンク',
        hex: '#F88379',
        description: '血色感をグッと高める温かいサンゴ色',
        category: 'main',
        coordPoint: 'トップスやリップに置くだけで、顔全体のトーンが2トーン明るく見えます。ベージュのジャケットのインナーにも華やか！',
        bestMatch: 'ウォームベージュ / コーラルリップ / 華奢アクセ',
      },
      {
        name: 'ムーンライトイエロー',
        hex: '#FFE58F',
        description: '夜桜を照らす柔らかな月光のレモンゴールド',
        category: 'accent',
        coordPoint: 'カーディガンや差し色のバッグ、ストールに。デニムと合わせるだけで一気に垢抜けた休日カジュアルが完成します。',
        bestMatch: 'インディゴデニム / ホワイトスニーカー / ゴールド',
      },
      {
        name: '若葉グリーン (リーフ)',
        hex: '#A8D5BA',
        description: '芽吹いたばかりのみずみずしい新緑',
        category: 'main',
        coordPoint: '爽やかで好印象を与えたいオフィス服におすすめ。白シャツとレイヤードすると清潔感あふれる知的なスタイルに。',
        bestMatch: '白シャツ / キャメルローファー / アイボリーパンツ',
      },
      {
        name: 'アイボリーホワイト',
        hex: '#FFFFF0',
        description: '肌をふんわり明るく見せる温かな白',
        category: 'base',
        coordPoint: '純白だと浮きやすい春タイプの神カラー。ブラウス、ニット、コートなどメインのトップスに選ぶと肌馴染み抜群。',
        bestMatch: '春色全般 / ゴールド金具 / ベージュトレンチ',
      },
      {
        name: 'ピーチメルバ',
        hex: '#FFCBA4',
        description: '手肌に極上の透明感を与える桃色',
        category: 'main',
        coordPoint: 'ネイルやチーク、サマーニットに。手元の肌色をみずみずしく綺麗に見せ、女性らしい柔らかさを引き立てます。',
        bestMatch: 'ピーチネイル / ブラウンマスカラ / リネンワンピ',
      },
      {
        name: 'アプリコット',
        hex: '#FBCEB1',
        description: '華やかで健康的な明るいオレンジ',
        category: 'main',
        coordPoint: 'カジュアルなボーダートップスやフレアスカートに。元気で親しみやすい印象を演出したい日にぴったりです。',
        bestMatch: 'カーキ / エスパドリーユ / ベージュキャップ',
      },
      {
        name: 'ターコイズスプリング',
        hex: '#40E0D0',
        description: '春の澄んだ空のような明るい青緑',
        category: 'accent',
        coordPoint: 'アクセサリーやスカーフ、夏場の水着・サンダルに。シンプルな白コーデの主役アクセントとして絶大な効果を発揮します。',
        bestMatch: '白ワンピース / かごバッグ / ターコイズピアス',
      },
      {
        name: 'ハニーゴールド',
        hex: '#E6BE8A',
        description: 'アクセサリーや小物に最適なツヤ感ゴールド',
        category: 'accent',
        coordPoint: 'ジュエリー、パンプスの金具、時計のベルトに。春タイプのツヤ肌と共鳴して高級感をプラスしてくれます。',
        bestMatch: 'ゴールドジュエリー / キャメルバッグ',
      },
      {
        name: 'ライトキャメル',
        hex: '#C19A6B',
        description: '春の装いを上品に引き締めるベースカラー',
        category: 'base',
        coordPoint: 'トレンチコートやレザースカート、ブーツに。黒の代わりに引き締め色として使うと、重くならずに洗練されます。',
        bestMatch: 'コーラルトップス / アイボリーニット',
      },
      {
        name: 'ポピーレッド',
        hex: '#E35335',
        description: '生き生きとしたエネルギーをプラスする赤',
        category: 'accent',
        coordPoint: 'リップやミニバッグ、シューズの差し色に。イエベ春の多幸感を最も華やかにアピールできる主役カラーです。',
        bestMatch: 'デニム / ベージュトレンチ / 赤リップ',
      },
      {
        name: 'ウォームベージュ',
        hex: '#F5F5DC',
        description: 'どんな服にも自然に馴染む軽やかな定番色',
        category: 'base',
        coordPoint: 'セットアップやワイドパンツ、デイリートートに。どんな春カラーとも優しく調和する頼れる万能選手。',
        bestMatch: 'ピンクブラウス / ミントカーディガン',
      },
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
    primaryColor: '#38BDF8',
    accentColor: '#A78BFA',
    bgGradient: 'from-sky-50 via-indigo-50/50 to-teal-50',
    cardBg: 'bg-gradient-to-br from-sky-50/90 via-purple-50/80 to-teal-50/90',
    textColor: 'text-slate-900',
    borderColor: 'border-sky-300',
    keywords: ['アイスブルー', 'ラベンダー', 'ローズピンク', 'ソフトホワイト', 'ミントグリーン', 'ブルーグレー'],
    palette: [
      {
        name: 'ソーダブルー (サイダーの泡)',
        hex: '#89CFF0',
        description: '弾けるサイダーのような涼やかで清涼感あふれる水色',
        category: 'main',
        coordPoint: 'ミルキーホワイトのトップスやアイスグレーのパンツと合わせると、透明感あふれる涼感コーデに。オフィスの爽やかなブラウスにも最適！',
        bestMatch: '白ブラウス / シルバーアクセ / アイシーグレー',
      },
      {
        name: 'トワイライトラベンダー (夕暮れの空)',
        hex: '#BDB0D0',
        description: '夏の夕暮れ時に空が紫に染まる一瞬を切り取った色',
        category: 'main',
        coordPoint: 'ブルベ夏の魅力を最大に引き出す勝負色！シアー素材のカーディガンやプリーツスカートに取り入れると、儚げで洗練されたオーラを放ちます。',
        bestMatch: 'ローズリップ / ココアブラウン / サテン素材',
      },
      {
        name: 'ローズピンク',
        hex: '#FF66CC',
        description: '青みを含んだソフトでフェミニンな華やぎピンク',
        category: 'accent',
        coordPoint: '甘すぎず知的な青みピンク。顔まわりのスカーフやトップス、リップ・チークに持ってくると、肌の白さと透明感が一気に際立ちます。',
        bestMatch: 'シアーネイビー / パールピアス / 白ニット',
      },
      {
        name: 'ミントグリーン (海風)',
        hex: '#98FF98',
        description: '爽快で清潔感ある淡いグリーン',
        category: 'main',
        coordPoint: 'リネンシャツやフレアスカートに。グレーのサンダルやホワイトバッグと合わせると、初夏の風のようなクリーンな印象に。',
        bestMatch: 'ライトグレー / ホワイトスニーカー / シルバー時計',
      },
      {
        name: 'ミルキーホワイト',
        hex: '#F8F9FA',
        description: '純白より柔らかく、肌に溶け込むミルキーな白',
        category: 'base',
        coordPoint: 'ブルベ夏の必須ベースカラー。真っ白よりも少しだけ柔らかいトーンが肌にスッと馴染み、上品な透明感の土台を作ります。',
        bestMatch: '全サマーパレット / プラチナジュエリー',
      },
      {
        name: 'ブルーグレー',
        hex: '#6699CC',
        description: '夏の装いを一気に都会的で上品に格上げするニュアンス色',
        category: 'base',
        coordPoint: '黒の代わりに使える万能シックカラー。セットアップ、トレンチ、テーパードパンツに選ぶと、知的でエレガントな佇まいに。',
        bestMatch: '白Tシャツ / ラベンダーインナー / プラチナ小物',
      },
      {
        name: 'オーキッド (薄紫の宵)',
        hex: '#DA70D6',
        description: '上品さと優雅さを引き出すエレガントな蘭色',
        category: 'main',
        coordPoint: 'ワンピースやきれいめニットに。ゴールドよりもシルバーやパールのアクセサリーを合わせると、大人の華やかさが完成します。',
        bestMatch: 'シルバーバングル / アイシーグレーパンプス',
      },
      {
        name: 'アイスグレー',
        hex: '#DCDCDC',
        description: 'シルバーやプラチナと好相性の澄んだベースカラー',
        category: 'base',
        coordPoint: 'スーツ、コート、スラックスの王道色。黄みのないクリアなグレーなので、肌をくすませずスッキリ見せてくれます。',
        bestMatch: 'パステルニット / ネイビーバッグ / 白スニーカー',
      },
      {
        name: 'ココアブラウン',
        hex: '#7D5C58',
        description: '黄みを抑えた、夏タイプにぴったりのシックな茶色',
        category: 'base',
        coordPoint: '黄みの強いキャメルが苦手なブルベ夏のための神ブラウン。秋冬のコートやレザーバッグ、アイシャドウの締め色に重宝します。',
        bestMatch: 'ラベンダーニット / ローズウッドリップ',
      },
      {
        name: 'スイカレッド (ウォーターメロン)',
        hex: '#FC6C85',
        description: '涼やかさを失わずに血色感を灯す夏の赤',
        category: 'accent',
        coordPoint: '青みを含んだジューシーな赤。リップやペディキュア、バッグのワンポイントに使うと、上品な女性らしさがグンと高まります。',
        bestMatch: 'ホワイトデニム / 麦わら帽子 / 赤リップ',
      },
      {
        name: 'シアーネイビー',
        hex: '#2A52BE',
        description: '黒よりも軽やかで、凛とした知性を演出する紺色',
        category: 'base',
        coordPoint: 'オフィスやお呼ばれのフォーマルウェアに最適。肌をパッと白く引き締め、清潔感と信頼感を最高レベルに高めてくれます。',
        bestMatch: 'アイスブルーシャツ / シルクスカーフ',
      },
      {
        name: 'プラチナシルバー',
        hex: '#E5E4E2',
        description: 'アクセサリーやラメに最高に映える涼感シルバー',
        category: 'accent',
        coordPoint: 'ネックレス、ピアス、リング、アイシャドウのラメに。ブルベ夏のひんやりした肌感と溶け合うようにマッチします。',
        bestMatch: 'シルバー925 / ホワイトゴールド / パール',
      },
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
    primaryColor: '#D97706',
    accentColor: '#B91C1C',
    bgGradient: 'from-amber-50 via-orange-50/60 to-stone-100',
    cardBg: 'bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-stone-100/90',
    textColor: 'text-amber-950',
    borderColor: 'border-amber-400',
    keywords: ['テラコッタ', 'マスタード', 'オリーブグリーン', 'キャメル', 'カーキ', 'ボルドー'],
    palette: [
      {
        name: 'テラコッタ (滲む素焼き)',
        hex: '#D45B34',
        description: '秋のぬくもりを凝縮した、手肌を艶やかに魅せるレンガ色',
        category: 'main',
        coordPoint: '秋タイプの絶対的エース！リブニットやロングコートに取り入れると、大人の色気とリッチな華やかさが際立ちます。',
        bestMatch: 'リッチキャメル / ゴールドフープピアス / ブラウンブーツ',
      },
      {
        name: 'マスタードゴールド (紅葉銀杏)',
        hex: '#DCA134',
        description: '黄金色に染まる銀杏並木のような深みのあるイエロー',
        category: 'main',
        coordPoint: 'ざっくり編みのカーディガンやストールに。カーキやデニムと合わせると、温かみのあるレトロシックなスタイルが完成。',
        bestMatch: 'ダークデニム / オリーブボトム / レザーバッグ',
      },
      {
        name: 'オリーブモス (深緑の森)',
        hex: '#556B2F',
        description: 'シックで大人びた印象を作る絶妙なグリーン',
        category: 'base',
        coordPoint: 'ミリタリージャケットやマキシスカートに。生成りやゴールドと合わせると、都会的で洗練されたアースカラーコーデに。',
        bestMatch: 'ウォームホワイト / アンティークゴールド / ローファー',
      },
      {
        name: 'バーントアンバー (焼き栗)',
        hex: '#8A3324',
        description: '水彩画の影のように奥深いブラウンレッド',
        category: 'accent',
        coordPoint: 'レザーシューズやバッグ、リップカラーに。秋の深まりを感じさせる重厚感で、全体のコーデをキリッと引き締めます。',
        bestMatch: 'ベージュトレンチ / チェックストール / 深色リップ',
      },
      {
        name: 'リッチキャメル',
        hex: '#C19A6B',
        description: '秋タイプのリッチな質感を最高に活かす王道カラー',
        category: 'base',
        coordPoint: 'ウールコートやテーラードジャケットに。羽織るだけでラグジュアリーなオーラをまとうことができる一生モノのベースカラー。',
        bestMatch: 'テラコッタインナー / ゴールド金具',
      },
      {
        name: 'パンプキンオレンジ',
        hex: '#FF7518',
        description: 'こっくりと熟した果実のような温かな橙',
        category: 'accent',
        coordPoint: '休日のカジュアルニットや差し色のマフラーに。秋の澄んだ空気に映えるフレンドリーで温かい存在感を放ちます。',
        bestMatch: 'ブラウンパンツ / かごバッグ / アンバーアクセ',
      },
      {
        name: 'カーキベージュ',
        hex: '#8F8B66',
        description: 'こなれ感とナチュラルな気品を両立する万能色',
        category: 'base',
        coordPoint: 'チノパン、マウンテンパーカー、サロペットに。カジュアルになりすぎず、品格をキープした大人のこなれ感を演出。',
        bestMatch: '白Tシャツ / レザースニーカー / ゴールドブレス',
      },
      {
        name: 'ディープフォレスト',
        hex: '#224229',
        description: '深呼吸したくなるような静寂の深い緑',
        category: 'base',
        coordPoint: '黒の代わりに使える深みグリーン。ロングコートやプリーツスカートに選ぶと、神秘的で知的な大人の魅力を醸し出します。',
        bestMatch: 'マスタードインナー / キャメルブーツ',
      },
      {
        name: 'アンティークゴールド',
        hex: '#CFB53B',
        description: '燻したようなヴィンテージ調の重厚な輝き',
        category: 'accent',
        coordPoint: '真鍮やブロンズ調のアクセサリー、バングル、ベルトに。肌の温かみと一体化して圧倒的なヴィンテージ感を演出。',
        bestMatch: '真鍮ジュエリー / レザーアイテム',
      },
      {
        name: 'ウォームホワイト (生成り)',
        hex: '#EAE6DF',
        description: '漂白されていない自然な温もりのオフホワイト',
        category: 'base',
        coordPoint: 'ケーブルニットやリネンシャツに。人工的でない天然のぬくもりが、イエベ秋の肌を優しく柔らかく包み込みます。',
        bestMatch: 'アースカラー全般 / べっ甲メガネ',
      },
      {
        name: 'サーモンベージュ',
        hex: '#FF8C69',
        description: '肌にやさしく馴染む落ち着いた血色カラー',
        category: 'main',
        coordPoint: 'ブラウスやチークカラーに。自然な血色感をプラスし、ヘルシーで優しい表情を引き出してくれます。',
        bestMatch: 'カーキジャケット / ブラウンアイシャドウ',
      },
      {
        name: 'ダークチョコレート',
        hex: '#3D1C02',
        description: '黒よりも優しく、洗練されたコントラストを生む締め色',
        category: 'base',
        coordPoint: 'レザーライダース、ブーツ、アイライナーに。強い黒よりも肌馴染みが良く、深みのあるモダンな印象に仕上がります。',
        bestMatch: 'テラコッタスカート / ゴールドピアス',
      },
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
    primaryColor: '#2563EB',
    accentColor: '#9333EA',
    bgGradient: 'from-slate-100 via-blue-50/50 to-indigo-50',
    cardBg: 'bg-gradient-to-br from-slate-100/90 via-blue-50/80 to-purple-50/90',
    textColor: 'text-slate-900',
    borderColor: 'border-blue-400',
    keywords: ['ロイヤルブルー', 'アイシーピンク', 'ピュアホワイト', 'ブラック', 'ワインレッド', 'シルバー'],
    palette: [
      {
        name: 'ロイヤルブルー (深海の青)',
        hex: '#1A4384',
        description: '白銀の雪景色に鮮烈に映える、高貴で冴えた青',
        category: 'main',
        coordPoint: '冬タイプの気品を最も美しく引き立てる勝負色！ピュアホワイトのパンツや漆黒のコートと合わせると、息を呑むような存在感に。',
        bestMatch: 'ピュアホワイト / プラチナジュエリー / 赤リップ',
      },
      {
        name: 'アイシーローズ (凍った花)',
        hex: '#F0E6EF',
        description: '氷でコーティングされた花びらのように極限まで淡い冷光ピンク',
        category: 'main',
        coordPoint: '冬タイプの顔色をクリアに照らすハイライトカラー。黒のレザージャケットのインナーや、とろみブラウスにおすすめ。',
        bestMatch: 'ジェットブラック / シルバーパンプス / モーヴチーク',
      },
      {
        name: 'ピュアホワイト (純白の雪)',
        hex: '#FFFFFF',
        description: '黄みのない、雪原そのもののクリアな真っ白',
        category: 'base',
        coordPoint: '冬タイプだからこそ着こなせる濁りのない完全な白。シャツやコートに選ぶと、レフ板効果で肌の透明感が劇的にアップ。',
        bestMatch: 'ブラックボトムス / 鮮烈レッドリップ',
      },
      {
        name: '漆黒 (ジェットブラック)',
        hex: '#0A0A0A',
        description: '冬タイプだからこそスタイリッシュに着こなせる絶対の黒',
        category: 'base',
        coordPoint: '全身黒でも決して重く見えず、スタイリッシュなモード感を放てるのは冬タイプの特権。シルバーアクセを効かせてクールに。',
        bestMatch: 'シルバーチョーカー / アイシーカラー全般',
      },
      {
        name: 'ルビーワイン (真冬の薔薇)',
        hex: '#722F37',
        description: 'ドラマティックで深みのある大人のディープレッド',
        category: 'accent',
        coordPoint: '冬の夜のお出かけやパーティーに。リップやロングワンピース、カシミヤストールに取り入れると、大人の色香が漂います。',
        bestMatch: 'ブラックドレス / ダイヤジュエリー / クラッチバッグ',
      },
      {
        name: 'フューシャピンク',
        hex: '#FF007F',
        description: '視線を惹きつける鮮やかでクールなネオンピンク',
        category: 'accent',
        coordPoint: 'バッグやパンプス、リップなどワンポイントに。モノトーンコーデに1点投入するだけで、一気にファッショニスタな装いに。',
        bestMatch: 'モノトーンコーデ / 黒スキニー / グロッシーリップ',
      },
      {
        name: 'アイシーブルー (氷晶)',
        hex: '#D4F1F4',
        description: '清らかな氷のきらめきを連想させる極淡ブルー',
        category: 'base',
        coordPoint: 'ハイゲージニットやシャツに。黒やネイビーのボトムスと合わせるだけで、涼やかで知的なオフィススタイルが完成。',
        bestMatch: 'ネイビーパンツ / ホワイトスニーカー / シルバー時計',
      },
      {
        name: 'エメラルドグリーン',
        hex: '#50C878',
        description: '宝石のように澄み渡った鮮やかな冷緑',
        category: 'main',
        coordPoint: 'きれいめタイトスカートやブラウスに。濁りのない鮮やかなグリーンが、冬タイプのキリリとした顔立ちを引き締めます。',
        bestMatch: '黒タートル / シルバーピアス / ポインテッドトゥ',
      },
      {
        name: 'ミッドナイトネイビー',
        hex: '#000080',
        description: '真夜中の静寂を纏う、気品ある濃紺',
        category: 'base',
        coordPoint: 'スーツ、チェスターコート、オケージョンドレスに。黒に劣らない引き締め力と、ノーブルな知性を両立します。',
        bestMatch: 'アイシーローズブラウス / パールネックレス',
      },
      {
        name: 'アイシーバイオレット',
        hex: '#D8D4E2',
        description: '涼やかで透明感あふれる極薄の紫',
        category: 'main',
        coordPoint: 'サマーニットやサテンスカートに。ミステリアスで透明感のある女性らしさを自然に醸し出したいときに。',
        bestMatch: 'チャコールグレー / プラチナリング / ラベンダーシャドウ',
      },
      {
        name: 'シルバーメタリック',
        hex: '#C0C0C0',
        description: '氷の結晶のように鋭く輝くプラチナシルバー',
        category: 'accent',
        coordPoint: 'パンプス、バッグ、ジュエリーに。シャープな光沢が冬タイプの透明感を最高潮にブーストしてくれます。',
        bestMatch: '冬色全般 / クリスタルアクセサリー',
      },
      {
        name: 'マゼンタパープル',
        hex: '#9E0142',
        description: 'クールさと情熱を併せ持つ洗練のバイオレット',
        category: 'accent',
        coordPoint: '鮮やかなカラーパンツや主役級ニットに。冬タイプのドラマティックな魅力を大胆にアピールできる一押しカラーです。',
        bestMatch: '黒ライダース / ホワイトシャツ / シルバーバッグ',
      },
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
