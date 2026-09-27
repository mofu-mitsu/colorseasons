// lib/gas-sync.ts
// 診断結果をGoogleスプレッドシート（Google Apps Script Web App）へバックグラウンド送信するユーティリティ

import { AnalysisResult, rgbToHex } from './color-analysis';

const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbwPvR9wmSoayCOZp9dqGnSMVeY9V6EaVIy8KhIFX04Ss7DuZjQs92vk6sKFfebtjy_3DA/exec';

export async function sendResultToGAS(
  result: AnalysisResult,
  mode: 'quick' | 'detailed'
): Promise<void> {
  const gasUrl =
    process.env.NEXT_PUBLIC_GAS_WEBAPP_URL ||
    DEFAULT_GAS_URL;

  if (!gasUrl) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    primarySeason: result.primarySeason,
    secondarySeason: result.secondarySeason,
    springScore: result.scores.spring,
    summerScore: result.scores.summer,
    autumnScore: result.scores.autumn,
    winterScore: result.scores.winter,
    skinHex: rgbToHex(result.dominantRGB),
    oklchL: (result.oklch.l * 100).toFixed(1),
    oklchC: result.oklch.c.toFixed(3),
    oklchH: result.oklch.h.toFixed(1),
    mode: mode === 'quick' ? '写真速攻' : '写真＋見え方チェック',
    isCalibrated: result.isCalibrated ? 'あり' : 'なし',
  };

  try {
    // GAS Web App への送信（CORS対策として no-cors または text/plain）
    await fetch(gasUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // ユーザー体験を損なわないようサイレントにログのみ記録
    console.warn('GAS logging skipped or failed:', error);
  }
}
