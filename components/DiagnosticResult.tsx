'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SeasonType,
  AnalysisResult,
  SEASONS_DATA,
  PaletteColorItem,
  rgbToHex,
} from '@/lib/color-analysis';
import RiekoBird from './RiekoBird';
import SeasonalCardEffect from './SeasonalCardEffect';
import ResultImageModal from './ResultImageModal';
import { generateResultImage } from '@/lib/generate-result-image';
import confetti from 'canvas-confetti';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faShareNodes,
  faBagShopping,
  faPalette,
  faCheck,
  faCopy,
  faMagnifyingGlass,
  faArrowUpRightFromSquare,
  faShieldHeart,
  faLightbulb,
} from '@fortawesome/free-solid-svg-icons';
import { Sparkles, RefreshCw } from 'lucide-react';

interface DiagnosticResultProps {
  result: AnalysisResult;
  onRetake: () => void;
}

interface RakutenItem {
  itemName: string;
  itemPrice: number;
  itemUrl: string;
  imageUrl?: string;
  shopName: string;
}

export default function DiagnosticResult({ result, onRetake }: DiagnosticResultProps) {
  const [selectedColor, setSelectedColor] = useState<PaletteColorItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // 楽天市場APIステート
  const [rakutenTab, setRakutenTab] = useState<'all' | 'fashion' | 'cosmetics' | 'accessory'>('all');
  const [customKeyword, setCustomKeyword] = useState('');
  const [rakutenItems, setRakutenItems] = useState<RakutenItem[]>([]);
  const [isRakutenLoading, setIsRakutenLoading] = useState(false);
  const [rakutenConfigured, setRakutenConfigured] = useState<boolean | null>(null);

  const seasonInfo = SEASONS_DATA[result.primarySeason];
  const secondSeasonInfo = SEASONS_DATA[result.secondarySeason];
  const cardRef = useRef<HTMLDivElement | null>(null);
  const colorDetailRef = useRef<HTMLDivElement | null>(null);

  // パレットクリック時に自動スクロール
  const handleSelectColor = (color: PaletteColorItem) => {
    setSelectedColor(color);
    setTimeout(() => {
      colorDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  };

  // 初回表示時に四季特化の紙吹雪演出
  useEffect(() => {
    try {
      if (result.primarySeason === 'summer') {
        // 🫧 夏：サイダーの泡としゅわしゅわバブル、夕暮れの淡い紫
        confetti({
          particleCount: 55,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#7DD3FC', '#38BDF8', '#BAE6FD', '#E0E7FF', '#FFFFFF', '#DDD6FE'],
          shapes: ['circle'],
          scalar: 1.2,
        });
      } else if (result.primarySeason === 'spring') {
        // 🌸 春：桜の花びらと月明かりのゴールド
        confetti({
          particleCount: 50,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#FDA4AF', '#FB7185', '#FDE68A', '#FEF3C7', '#A7F3D0'],
          scalar: 1.1,
        });
      } else if (result.primarySeason === 'autumn') {
        // 🍁 秋：滲む紅葉、橙とテラコッタ
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#EA580C', '#D97706', '#B45309', '#BE123C', '#FBBF24'],
          scalar: 1.1,
        });
      } else {
        // ❄️ 冬：白銀と氷の結晶、冴えたブルー
        confetti({
          particleCount: 55,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#60A5FA', '#3B82F6', '#C084FC', '#FFFFFF', '#E0F2FE'],
          shapes: ['circle', 'square'],
          scalar: 1.2,
        });
      }
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  }, [result.primarySeason]);

  // 楽天市場API呼び出し
  const fetchRakutenProducts = async (keyword: string) => {
    setIsRakutenLoading(true);

    // 同じキーワードでも毎回違う商品を見られるよう、検索ページをランダム化
    const randomPage = Math.floor(Math.random() * 6) + 1;

    console.log(`🛍️ [Rakuten API] リクエスト開始: keyword="${keyword}", page=${randomPage}`);
    try {
      const res = await fetch(
        `/api/rakuten?keyword=${encodeURIComponent(keyword)}&page=${randomPage}`
      );
      const data = await res.json();
      
      console.log('🛍️ [Rakuten API 詳細ログ]:', {
        status: res.status,
        configured: data.configured,
        success: data.success,
        itemCount: data.items?.length || 0,
        envStatus: data.envStatus,
        error: data.error,
        details: data.details,
        rawItems: data.items,
      });

      if (data.configured) {
        setRakutenConfigured(true);
        if (Array.isArray(data.items) && data.items.length > 0) {
          setRakutenItems(data.items);
        } else {
          console.warn('🛍️ [Rakuten API] 商品が0件でした。キーワードや検索条件を確認してください。', data);
        }
      } else {
        setRakutenConfigured(false);
        console.warn('🛍️ [Rakuten API] 環境変数が検出されませんでした (configured: false):', data.envStatus);
      }
    } catch (err) {
      console.error('🛍️ [Rakuten API] 通信エラーまたは例外発生:', err);
      setRakutenConfigured(false);
    } finally {
      setIsRakutenLoading(false);
    }
  };

  // 初回およびタブ切り替え時に楽天商品をフェッチ
  useEffect(() => {
    const defaultQuery = seasonInfo.rakutenQueries[0]?.keyword || `${seasonInfo.nameEn} ファッション`;
    fetchRakutenProducts(defaultQuery);
  }, [result.primarySeason, seasonInfo]);

  // 診断結果カード画像の生成＆モーダル表示
  const handleOpenImageModal = async () => {
    setIsGeneratingImage(true);
    try {
      const dataUrl = await generateResultImage(result);
      setGeneratedImageUrl(dataUrl);
      setIsImageModalOpen(true);
    } catch (err) {
      console.error('Image generation error:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // ナビゲーション共有 / URLコピー
  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareText = `【四季色】手のひらパーソナルカラー診断で「${seasonInfo.name} (${seasonInfo.subTitle})」でした！🌸🫧🍁❄️ #四季色 #パーソナルカラー診断`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '四季色 パーソナルカラー診断',
          text: shareText,
          url,
        });
        return;
      } catch (err) {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // X (Twitter) 共有リンク
  const getTwitterShareUrl = () => {
    const text = encodeURIComponent(
      `手のひらの肌色から色彩解析する「四季色 パーソナルカラー診断」を受けました！\n結果は【${seasonInfo.name}】(${seasonInfo.subTitle})でした🌸🫧🍁❄️\nオオマシコの案内役りえこちゃんと一緒に探す四季のパレット🕊️\n`
    );
    const url = typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : '';
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  };

  const getRakutenSearchUrl = (query: string) => {
    return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(query)}/`;
  };

  const filteredQueries =
    rakutenTab === 'all'
      ? seasonInfo.rakutenQueries
      : seasonInfo.rakutenQueries.filter((q) => q.category === rakutenTab);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-16">
      {/* 診断結果トップカード（四季別の動的エフェクト内蔵） */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-10 shadow-2xl border ${seasonInfo.borderColor} ${seasonInfo.cardBg} backdrop-blur-md`}
      >
        {/* 四季別の背景エフェクト（夏ならサイダーの泡・水面、春なら桜、秋ならもみじ、冬なら雪結晶） */}
        <SeasonalCardEffect season={result.primarySeason} />

        {/* コンテンツ本体（z-10） */}
        <div className="relative z-10 space-y-6">
          {/* 上部タグ＆案内役 */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-black/5 w-full">
            <div className="w-full lg:flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/90 backdrop-blur-xs rounded-full text-xs font-bold text-rose-700 shadow-2xs mb-2">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>パーソナルカラー診断結果</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                {seasonInfo.name}
              </h1>
              <p className="text-base sm:text-xl font-semibold text-slate-700 mt-1">
                “ {seasonInfo.subTitle} ”
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-bold shadow-xs">
                  {seasonInfo.undertone}
                </span>
                <span className="px-3 py-1 bg-white/90 text-slate-800 rounded-full text-xs font-medium border border-slate-200">
                  トーン: {seasonInfo.tone}
                </span>
                <span className="px-3 py-1 bg-white/90 text-slate-800 rounded-full text-xs font-medium border border-slate-200">
                  2nd: {secondSeasonInfo.name.split(' ')[0]}
                </span>
              </div>
            </div>

            {/* りえこちゃんの案内コメント */}
            <div className="w-full lg:w-auto shrink-0 flex justify-center lg:justify-end overflow-hidden max-w-full">
              <RiekoBird
                season={result.primarySeason}
                message={seasonInfo.riekoComment}
                pose="celebrating"
                size="md"
              />
            </div>
          </div>

          {/* 四季の世界観ストーリー */}
          <div className="py-2 border-b border-black/5">
            <div className="bg-white/85 backdrop-blur-xs rounded-2xl p-5 border border-white/70 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faPalette} className="text-rose-500" />
                <span>世界観と雰囲気</span>
              </h3>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-sans">
                {seasonInfo.atmosphere}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                {seasonInfo.description}
              </p>
            </div>
          </div>

          {/* 手肌色の解析データ ＆ 4シーズン調和スコア */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2 border-b border-black/5">
            {/* 肌色サンプリング情報 */}
            <div className="bg-white/85 backdrop-blur-xs rounded-2xl p-5 border border-white/70 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faShieldHeart} className="text-rose-500" />
                  <span>手肌の色彩測定値 (OKLCH)</span>
                </span>
                {result.isCalibrated && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                    白補正済
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div
                  style={{ backgroundColor: rgbToHex(result.dominantRGB) }}
                  className="w-14 h-14 rounded-2xl shadow-md border-2 border-white ring-1 ring-slate-200 shrink-0"
                  title={`HEX: ${rgbToHex(result.dominantRGB)}`}
                />
                <div className="text-xs text-slate-600 space-y-0.5 font-mono">
                  <div>HEX: <span className="font-bold text-slate-800">{rgbToHex(result.dominantRGB)}</span></div>
                  <div>明度 (L): <span className="text-slate-800">{(result.oklch.l * 100).toFixed(1)}%</span></div>
                  <div>彩度 (C): <span className="text-slate-800">{result.oklch.c.toFixed(3)}</span></div>
                  <div>色相 (H): <span className="text-slate-800">{result.oklch.h.toFixed(1)}°</span></div>
                </div>
              </div>

              <p className="text-xs text-slate-700 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed font-sans">
                🖐️ {result.skinDescription}
              </p>
            </div>

            {/* 4シーズンのスコアバー */}
            <div className="bg-white/85 backdrop-blur-xs rounded-2xl p-5 border border-white/70 shadow-xs space-y-2.5">
              <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>四季との調和度（システム一致度）</span>
                <span className="text-[10px] text-slate-400 font-normal">合計100%</span>
              </div>

              {(
                [
                  { id: 'spring', label: '春 (Spring)', score: result.scores.spring, color: 'bg-rose-400' },
                  { id: 'summer', label: '夏 (Summer)', score: result.scores.summer, color: 'bg-sky-400' },
                  { id: 'autumn', label: '秋 (Autumn)', score: result.scores.autumn, color: 'bg-amber-500' },
                  { id: 'winter', label: '冬 (Winter)', score: result.scores.winter, color: 'bg-blue-600' },
                ] as const
              ).map((s) => (
                <div key={s.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={s.id === result.primarySeason ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                      {s.label}
                    </span>
                    <span className="text-slate-800 font-mono">{s.score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${s.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 似合うベストカラーパレット（12色） */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FontAwesomeIcon icon={faPalette} className="text-rose-500" />
                  <span>{seasonInfo.name} のベストカラーパレット</span>
                </h3>
                <p className="text-xs text-slate-500">
                  色をタップすると詳細とおすすめコーディネートのポイントが見られます
                </p>
              </div>
            </div>

            {/* カラーチップ一覧 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {seasonInfo.palette.map((color) => {
                const isSelected = selectedColor?.name === color.name;
                return (
                  <button
                    key={color.name}
                    onClick={() => handleSelectColor(color)}
                    className={`group relative p-3 rounded-2xl bg-white/95 border transition-all text-left shadow-2xs hover:shadow-md cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-rose-500 border-rose-300 scale-[1.02]'
                        : 'border-slate-200/80 hover:border-rose-300'
                    }`}
                  >
                    <div
                      style={{ backgroundColor: color.hex }}
                      className="w-full aspect-square rounded-xl shadow-inner mb-2 border border-black/10 group-hover:scale-105 transition-transform"
                    />
                    <div className="text-xs font-bold text-slate-800 truncate" title={color.name}>
                      {color.name}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-slate-400 font-mono uppercase">
                        {color.hex}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                        {color.category === 'base' ? '定番' : color.category === 'main' ? '主役' : '差し色'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 選択されたカラーの詳細＆おすすめコーディネートポイント */}
            <AnimatePresence>
              {selectedColor && (
                <motion.div
                  ref={colorDetailRef}
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: 10, height: 0 }}
                  className="mt-5 p-5 sm:p-6 rounded-3xl bg-white/95 border-2 border-rose-200 shadow-xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: selectedColor.hex }}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-md border-2 border-white ring-1 ring-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base sm:text-lg">
                            {selectedColor.name}
                          </h4>
                          <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                            {selectedColor.hex}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 font-sans">
                          {selectedColor.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedColor(null)}
                      className="self-end sm:self-center text-xs text-slate-400 hover:text-slate-700 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-xl cursor-pointer transition-colors shrink-0"
                    >
                      閉じる ✕
                    </button>
                  </div>

                  {/* おすすめコーディネートのポイント（詳細解説） */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {/* 着こなし＆メイクのアドバイス */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/70 to-pink-50/50 border border-rose-100/80">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 mb-1.5">
                        <span>👗</span>
                        <span>おすすめコーディネートのポイント</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-sans">
                        {selectedColor.coordPoint || 'このカラーをトップスや顔周りに持ってくると、肌の透明感と血色感がぐっと引き立ちます。'}
                      </p>
                    </div>

                    {/* 相性の良い配色＆アイテム */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50/70 to-indigo-50/50 border border-sky-100/80">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 mb-1.5">
                        <span>✨</span>
                        <span>ベスト相性アイテム・おすすめ配色</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
                        {selectedColor.bestMatch || 'ミルキーホワイト、シルバー、ブルーグレー'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 苦手色のアドバイス＆レスキュー */}
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/80 backdrop-blur-xs border border-rose-200/80">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                <FontAwesomeIcon icon={faLightbulb} className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  苦手になりやすい色と、お洒落に着こなすコツ
                </h4>
                <p className="text-xs text-rose-900 font-semibold mt-0.5">
                  注意したい色：{seasonInfo.ngColorAdvice.colorName}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {seasonInfo.ngColorAdvice.reason}
                </p>
                <p className="text-xs text-emerald-800 font-medium bg-emerald-50/90 p-2 rounded-xl border border-emerald-200 mt-2">
                  💡 <strong>レスキューテクニック:</strong> {seasonInfo.ngColorAdvice.workaround}
                </p>
              </div>
            </div>
          </div>

          {/* アクションボタンバー */}
          <div className="pt-4 border-t border-black/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* 画像保存（モーダルプレビュー付き） */}
              <button
                onClick={handleOpenImageModal}
                disabled={isGeneratingImage}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-full text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                title="結果カードを画像として保存・プレビュー"
              >
                {isGeneratingImage ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>画像生成中...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faDownload} className="w-3.5 h-3.5" />
                    <span>診断結果カードを画像保存</span>
                  </>
                )}
              </button>

              {/* X (Twitter) シェア */}
              <a
                href={getTwitterShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-full text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                title="X (Twitter) でシェアする"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>結果をポスト</span>
              </a>

              {/* ナビゲーション共有 */}
              <button
                onClick={handleShare}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                title="URLを共有またはコピー"
              >
                <FontAwesomeIcon
                  icon={copiedLink ? faCheck : faShareNodes}
                  className={`w-3.5 h-3.5 ${copiedLink ? 'text-emerald-500' : 'text-slate-500'}`}
                />
                <span>{copiedLink ? 'リンクをコピーしました！' : '結果を共有'}</span>
              </button>
            </div>

            <button
              onClick={onRetake}
              className="text-xs sm:text-sm text-slate-500 hover:text-rose-600 underline cursor-pointer"
            >
              別の写真でやり直す
            </button>
          </div>
        </div>
      </motion.div>

      {/* 楽天市場 似合うアイテム提案連携セクション */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl border border-rose-100 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold mb-1">
              <FontAwesomeIcon icon={faBagShopping} className="w-3.5 h-3.5 text-red-600" />
              <span>楽天市場連携 (IchibaItem Search 20260701)</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {seasonInfo.name} に似合うおすすめカラーアイテム
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              あなたのパーソナルカラーにぴったりなお洋服やコスメを楽天市場から探せます。
              同じキーワードでも、検索するたびに商品を入れ替えて表示します。
            </p>
          </div>

          {/* クイック推薦タブ */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-full text-xs font-medium shrink-0">
            {/* まずは診断タイプそのものを検索 */}
            <button
              onClick={() => fetchRakutenProducts(`${seasonInfo.shortUndertone}${seasonInfo.name.split(' ')[0]}`)}
              className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full border border-rose-400 transition-all cursor-pointer shadow-2xs font-bold"
              title="パーソナルカラー名で楽天市場を検索"
            >
              {seasonInfo.shortUndertone}{seasonInfo.name.split(' ')[0]}
            </button>

            {/* 季節ごとの具体的なカラー・カテゴリ検索 */}
            {seasonInfo.rakutenQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  fetchRakutenProducts(q.keyword);
                }}
                className="px-3 py-1 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-full border border-slate-200/80 transition-all cursor-pointer shadow-2xs font-semibold"
              >
                {q.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 自由検索ボックス */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full relative">
            <input
              type="text"
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customKeyword) {
                  fetchRakutenProducts(customKeyword);
                }
              }}
              placeholder={`例: ${seasonInfo.keywords[0]} ワンピース、${seasonInfo.keywords[1]} リップ`}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-rose-500"
            />
            <FontAwesomeIcon icon={faMagnifyingGlass} className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <button
            onClick={() => {
              if (customKeyword) fetchRakutenProducts(customKeyword);
            }}
            disabled={isRakutenLoading}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isRakutenLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faBagShopping} className="w-3.5 h-3.5" />
            )}
            <span>楽天市場で検索</span>
          </button>
        </div>

        {/* 楽天APIから取得された商品一覧（リアルタイム表示） */}
        {rakutenItems.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>検索結果商品（楽天市場）</span>
              <span className="text-[11px] text-slate-400">タップで楽天公式ページへ移動</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {rakutenItems.map((item, idx) => (
                <a
                  key={idx}
                  href={item.itemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-red-300 p-3 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    {item.imageUrl ? (
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2.5">
                        <img
                          src={item.imageUrl}
                          alt={item.itemName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-square rounded-xl bg-red-50/50 flex items-center justify-center text-2xl mb-2.5">
                        🛍️
                      </div>
                    )}
                    <h4 className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug group-hover:text-red-700 transition-colors">
                      {item.itemName}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-red-600 text-xs sm:text-sm font-mono">
                      {item.itemPrice > 0 ? `¥${item.itemPrice.toLocaleString()}` : ''}
                    </span>
                    <FontAwesomeIcon
                      icon={faArrowUpRightFromSquare}
                      className="w-3 h-3 text-slate-400 group-hover:text-red-600 transition-colors"
                    />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 推薦キーワードダイレクト検索リンク */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-semibold text-slate-600">
            おすすめキーワードで楽天市場を直接探す
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredQueries.map((item, idx) => (
              <a
                key={idx}
                href={getRakutenSearchUrl(item.keyword)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-red-300 bg-white hover:bg-red-50/20 transition-all flex items-center justify-between shadow-2xs group cursor-pointer"
              >
                <div>
                  <div className="font-bold text-slate-800 text-xs group-hover:text-red-700 transition-colors">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    「{item.keyword}」
                  </div>
                </div>
                <FontAwesomeIcon
                  icon={faArrowUpRightFromSquare}
                  className="w-3 h-3 text-slate-400 group-hover:text-red-600"
                />
              </a>
            ))}
          </div>
        </div>

        {/* ローディング表示 */}
        {isRakutenLoading && (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 text-red-500 animate-spin" />
            <span>楽天市場からアイテムを検索中...</span>
          </div>
        )}
      </motion.div>

      {/* 診断結果カード画像プレビュー＆保存モーダル */}
      <ResultImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={generatedImageUrl}
        seasonName={seasonInfo.nameEn}
      />
    </div>
  );
}
