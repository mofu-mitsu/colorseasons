// lib/generate-result-image.ts
// 診断結果カードの高解像度PNG画像を純粋なCanvas APIで描画・生成するユーティリティ

import { AnalysisResult, SEASONS_DATA, rgbToHex } from './color-analysis';

export async function generateResultImage(result: AnalysisResult): Promise<string> {
  const canvas = document.createElement('canvas');
  // 高解像度 1080 x 1440
  const width = 1080;
  const height = 1440;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  const season = SEASONS_DATA[result.primarySeason];
  const secondSeason = SEASONS_DATA[result.secondarySeason];
  const skinHex = rgbToHex(result.dominantRGB);

  // 1. 背景グラデーション
  const bg = ctx.createLinearGradient(0, 0, width, height);
  if (result.primarySeason === 'spring') {
    bg.addColorStop(0, '#FFFDF0');
    bg.addColorStop(0.4, '#FFE4E6');
    bg.addColorStop(1, '#ECFDF5');
  } else if (result.primarySeason === 'summer') {
    bg.addColorStop(0, '#F0F9FF');
    bg.addColorStop(0.5, '#EDE9FE');
    bg.addColorStop(1, '#F0FDFA');
  } else if (result.primarySeason === 'autumn') {
    bg.addColorStop(0, '#FEF3C7');
    bg.addColorStop(0.5, '#FFEDD5');
    bg.addColorStop(1, '#F5F5F4');
  } else {
    bg.addColorStop(0, '#F8FAFC');
    bg.addColorStop(0.5, '#EFF6FF');
    bg.addColorStop(1, '#FAF5FF');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // 2. メインカード背景（角丸・シャドウ）
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 15;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.beginPath();
  ctx.roundRect(60, 60, width - 120, height - 120, 36);
  ctx.fill();
  ctx.restore();

  // カード枠線
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(60, 60, width - 120, height - 120, 36);
  ctx.stroke();

  // 3. ヘッダータイトル
  ctx.textAlign = 'center';
  ctx.fillStyle = '#E11D48';
  ctx.font = 'bold 24px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  ctx.fillText('四季色 - 手のひらから探すパーソナルカラー診断', width / 2, 130);

  // 4. シーズン名
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 64px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  ctx.fillText(season.name, width / 2, 215);

  // キャッチフレーズ
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 28px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
  ctx.fillText(`“ ${season.subTitle} ”`, width / 2, 265);

  // タグバッジ
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(width / 2 - 220, 290, 210, 42, 21);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
  ctx.fillText(season.shortUndertone === 'ブルベ' ? 'ブルーベース (ブルベ)' : 'イエローベース (イエベ)', width / 2 - 115, 319);

  ctx.fillStyle = '#F1F5F9';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(width / 2 + 10, 290, 210, 42, 21);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 19px "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
  ctx.fillText(`2nd: ${secondSeason.name.split(' ')[0]}`, width / 2 + 115, 318);

  // 5. 手肌の色彩測定エリア
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(110, 360, width - 220, 110, 24);
  ctx.fill();
  ctx.stroke();

  // 肌色サークルスウォッチ
  ctx.save();
  ctx.fillStyle = skinHex;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(180, 415, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 24px "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
  ctx.fillText('測定された手肌色', 240, 405);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`HEX: ${skinHex}  |  L: ${(result.oklch.l * 100).toFixed(0)}%  C: ${result.oklch.c.toFixed(2)}  H: ${result.oklch.h.toFixed(0)}°`, 240, 438);

  // 6. 4シーズン調和スコアバー
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 24px "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
  ctx.fillText('四季の調和度スコア', 110, 520);

  const scoresList = [
    { label: '春 (Spring)', score: result.scores.spring, active: result.primarySeason === 'spring', color: '#FB7185' },
    { label: '夏 (Summer)', score: result.scores.summer, active: result.primarySeason === 'summer', color: '#38BDF8' },
    { label: '秋 (Autumn)', score: result.scores.autumn, active: result.primarySeason === 'autumn', color: '#F59E0B' },
    { label: '冬 (Winter)', score: result.scores.winter, active: result.primarySeason === 'winter', color: '#3B82F6' },
  ];

  scoresList.forEach((s, idx) => {
    const y = 560 + idx * 46;
    ctx.textAlign = 'left';
    ctx.fillStyle = s.active ? '#E11D48' : '#475569';
    ctx.font = `${s.active ? 'bold' : 'normal'} 22px "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif`;
    ctx.fillText(s.label, 110, y);

    // バー背景
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(310, y - 18, 540, 22, 11);
    ctx.fill();

    // バー値
    ctx.fillStyle = s.active ? s.color : '#94A3B8';
    const barW = Math.max(16, (540 * s.score) / 100);
    ctx.beginPath();
    ctx.roundRect(310, y - 18, barW, 22, 11);
    ctx.fill();

    ctx.textAlign = 'right';
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`${s.score}%`, 950, y);
  });

  // 7. ベストカラーパレット（12色）
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 26px "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
  ctx.fillText(`似合うベストカラーパレット（代表12色）`, 110, 785);

  const pal = season.palette;
  pal.forEach((c, idx) => {
    const col = idx % 6;
    const row = Math.floor(idx / 6);
    const x = 110 + col * 144;
    const y = 815 + row * 135;

    // カラースウォッチ
    ctx.save();
    ctx.fillStyle = c.hex;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(x, y, 126, 75, 18);
    ctx.fill();
    ctx.restore();

    // 色名
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 15px "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
    const displayName = c.name.split(' ')[0];
    ctx.fillText(displayName.length > 7 ? displayName.slice(0, 7) + '…' : displayName, x + 63, y + 100);

    // HEX
    ctx.fillStyle = '#64748B';
    ctx.font = '13px monospace';
    ctx.fillText(c.hex.toUpperCase(), x + 63, y + 118);
  });

  // 8. オオマシコ（りえこちゃん）のひとこと枠
  ctx.fillStyle = '#FFF1F2';
  ctx.strokeStyle = '#FECDD3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(110, 1105, width - 220, 150, 24);
  ctx.fill();
  ctx.stroke();

  // オオマシコ ミニイラスト（Canvasベクター直接描画）
  const birdX = 180;
  const birdY = 1180;
  // 体
  ctx.fillStyle = '#F43F5E';
  ctx.beginPath();
  ctx.arc(birdX, birdY, 32, 0, Math.PI * 2);
  ctx.fill();
  // お腹
  ctx.fillStyle = '#FFE4E6';
  ctx.beginPath();
  ctx.ellipse(birdX + 6, birdY + 6, 20, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // 冠羽（銀白）
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(birdX - 6, birdY - 18, 12, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // 目
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(birdX + 14, birdY - 8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(birdX + 15, birdY - 9, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // 嘴
  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.moveTo(birdX + 22, birdY - 6);
  ctx.lineTo(birdX + 32, birdY - 2);
  ctx.lineTo(birdX + 22, birdY + 2);
  ctx.fill();

  // りえこちゃんメッセージ
  ctx.textAlign = 'left';
  ctx.fillStyle = '#BE123C';
  ctx.font = 'bold 20px "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
  ctx.fillText('案内役 りえこ（オオマシコ）より', 245, 1145);

  ctx.fillStyle = '#4C0519';
  ctx.font = '19px "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
  // 複数行に折り返し
  const commentText = season.riekoComment;
  const line1 = commentText.slice(0, 28);
  const line2 = commentText.slice(28);
  ctx.fillText(line1, 245, 1182);
  if (line2) {
    ctx.fillText(line2, 245, 1214);
  }

  // 9. カード下部署名
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '16px monospace';
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  ctx.fillText(`四季色 COLOR SEASONS  •  ${today}`, width / 2, 1315);

  return canvas.toDataURL('image/png', 1.0);
}
