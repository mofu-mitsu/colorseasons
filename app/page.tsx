'use client';

import React, { useState } from 'react';
import HeaderBreadcrumbs from '@/components/HeaderBreadcrumbs';
import SeasonalAtmosphere from '@/components/SeasonalAtmosphere';
import HandColorScanner from '@/components/HandColorScanner';
import OptionalQuestionnaire from '@/components/OptionalQuestionnaire';
import DiagnosticResult from '@/components/DiagnosticResult';
import PaletteGuideModal from '@/components/PaletteGuideModal';
import RiekoBird from '@/components/RiekoBird';
import {
  RGB,
  QuestionnaireAnswers,
  AnalysisResult,
  analyzeSkinColor,
  SeasonType,
} from '@/lib/color-analysis';
import { sendResultToGAS } from '@/lib/gas-sync';
import { motion, AnimatePresence } from 'motion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faListCheck,
  faHand,
  faShieldHalved,
  faRotateRight,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [mode, setMode] = useState<'quick' | 'detailed'>('quick');
  const [phase, setPhase] = useState<'upload' | 'questionnaire' | 'result'>('upload');
  const [detectedRGB, setDetectedRGB] = useState<RGB | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<AnalysisResult | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 手肌色が検出・確定された時
  const handleColorDetected = (rgb: RGB, calibratedRGB: RGB | null) => {
    setIsProcessing(true);
    const targetRGB = calibratedRGB || rgb;
    setDetectedRGB(targetRGB);
    setIsCalibrated(!!calibratedRGB);

    setTimeout(() => {
      setIsProcessing(false);
      if (mode === 'detailed') {
        setPhase('questionnaire');
      } else {
        // 即座に写真のみで診断
        const result = analyzeSkinColor(targetRGB, undefined, !!calibratedRGB);
        setDiagnosticResult(result);
        setPhase('result');
        // GASへバックグラウンド送信
        sendResultToGAS(result, 'quick');
      }
    }, 450);
  };

  // アンケート完了時
  const handleQuestionnaireComplete = (answers: QuestionnaireAnswers) => {
    if (!detectedRGB) return;
    const result = analyzeSkinColor(detectedRGB, answers, isCalibrated);
    setDiagnosticResult(result);
    setPhase('result');
    // GASへバックグラウンド送信
    sendResultToGAS(result, 'detailed');
  };

  // アンケートスキップ時
  const handleQuestionnaireSkip = () => {
    if (!detectedRGB) return;
    const result = analyzeSkinColor(detectedRGB, undefined, isCalibrated);
    setDiagnosticResult(result);
    setPhase('result');
    // GASへバックグラウンド送信
    sendResultToGAS(result, 'detailed');
  };

  // やり直し
  const handleReset = () => {
    setPhase('upload');
    setDetectedRGB(null);
    setDiagnosticResult(null);
    setIsCalibrated(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeSeason: SeasonType | null = diagnosticResult?.primarySeason || null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* 季節の大気・パーティクル背景（Hydration一致設計） */}
      <SeasonalAtmosphere season={activeSeason} />

      {/* パンくずリスト & ナビゲーション */}
      <HeaderBreadcrumbs
        season={activeSeason}
        onReset={handleReset}
        onOpenPaletteGuide={() => setIsGuideOpen(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center">
        {/* === フェーズ1: 写真アップロード・撮影 === */}
        {phase === 'upload' && (
          <div className="w-full space-y-8 max-w-3xl">
            {/* ヒーローヘッダー */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full border border-rose-200 shadow-2xs text-xs font-bold text-rose-600">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>手のひら・手の甲から探す四季のパレット</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                四季色 <span className="text-rose-500">COLOR SEASONS</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
                顔写真不要。手の肌色から色彩（OKLCH）を瞬間解析。<br className="hidden sm:inline" />
                春・夏・秋・冬の世界へ画面が染まるパーソナルカラー診断です。
              </p>

              {/* りえこちゃんの案内 */}
              <div className="flex justify-center pt-2">
                <RiekoBird
                  message="こんにちは、りえこです。あなたの肌色から、一番調和する四季の色をご案内しますね。"
                  size="md"
                />
              </div>
            </div>

            {/* 診断モードの切り替えタブ ＆ 機能差の説明カード */}
            <div className="space-y-3 max-w-2xl mx-auto">
              <div className="flex justify-center">
                <div className="bg-white/85 backdrop-blur-md p-1.5 rounded-full border border-slate-200 shadow-xs flex items-center gap-1">
                  <button
                    onClick={() => setMode('quick')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      mode === 'quick'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FontAwesomeIcon icon={faBolt} className="w-3.5 h-3.5" />
                    <span>写真で速攻診断（最速）</span>
                  </button>

                  <button
                    onClick={() => setMode('detailed')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      mode === 'detailed'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FontAwesomeIcon icon={faListCheck} className="w-3.5 h-3.5" />
                    <span>写真 ＋ 見え方チェック（高精度）</span>
                  </button>
                </div>
              </div>

              {/* モード別の機能差・特徴バナー（ユーザー要望対応） */}
              <AnimatePresence mode="wait">
                {mode === 'quick' ? (
                  <motion.div
                    key="quick-info"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-3.5 bg-rose-50/80 backdrop-blur-xs rounded-2xl border border-rose-200/80 text-xs text-rose-950 flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                      <FontAwesomeIcon icon={faBolt} className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-rose-900 flex items-center gap-1.5">
                        <span>【写真で速攻診断】モードの特徴</span>
                        <span className="text-[10px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-semibold">
                          目安：30秒
                        </span>
                      </div>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">
                        手の写真から肌色を即抽出し、OKLCH色彩空間（明度・彩度・色相）で瞬間計算。<strong>質問への回答を挟まず、すぐに結果の世界観を見たい方</strong>に最適です。
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="detailed-info"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-3.5 bg-sky-50/80 backdrop-blur-xs rounded-2xl border border-sky-200/80 text-xs text-sky-950 flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-full bg-sky-200 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                      <FontAwesomeIcon icon={faListCheck} className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sky-900 flex items-center gap-1.5">
                        <span>【写真 ＋ 見え方チェック】モードの特徴</span>
                        <span className="text-[10px] bg-sky-200 text-sky-800 px-2 py-0.5 rounded-full font-semibold">
                          目安：1〜2分
                        </span>
                      </div>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">
                        写真の色彩解析（80%）に加えて、「ピンクや白、アクセを当てた時に<strong>どちらが肌を明るく見せるか</strong>」の客観的Appearance比較4問（20%）を統合。<strong>好みの偏りを防ぎ、より精緻に4シーズンを判定</strong>したい方におすすめです。
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 手肌色スキャナー */}
            <HandColorScanner
              onColorDetected={handleColorDetected}
              isProcessing={isProcessing}
            />

            {/* 3つの安心ポイント */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-slate-700">
              <div className="p-4 bg-white/70 backdrop-blur-xs rounded-2xl border border-white/80 shadow-2xs text-center space-y-1">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-sm">
                  <FontAwesomeIcon icon={faHand} />
                </div>
                <div className="font-bold text-xs sm:text-sm">顔写真不要で安心</div>
                <div className="text-[11px] text-slate-500 leading-normal">
                  メイクや日焼け・照明のムラが少ない手の色で手軽に測定
                </div>
              </div>

              <div className="p-4 bg-white/70 backdrop-blur-xs rounded-2xl border border-white/80 shadow-2xs text-center space-y-1">
                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto text-sm">
                  <FontAwesomeIcon icon={faBolt} />
                </div>
                <div className="font-bold text-xs sm:text-sm">待ち時間ゼロで即判定</div>
                <div className="text-[11px] text-slate-500 leading-normal">
                  AIサーバー通信を待たず、ブラウザ内Canvasで即座にOKLCH色彩解析
                </div>
              </div>

              <div className="p-4 bg-white/70 backdrop-blur-xs rounded-2xl border border-white/80 shadow-2xs text-center space-y-1">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-sm">
                  <FontAwesomeIcon icon={faShieldHalved} />
                </div>
                <div className="font-bold text-xs sm:text-sm">画像は保存されません</div>
                <div className="text-[11px] text-slate-500 leading-normal">
                  写真は端末内のみで処理され外部サーバーへ送信・保存されません
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === フェーズ2: 任意の見え方チェック質問 === */}
        {phase === 'questionnaire' && (
          <div className="w-full space-y-6">
            <div className="flex justify-center">
              <RiekoBird
                message="あと少しです。お肌に当てたときに、パッと明るく見える色を選んでみてくださいね。"
                size="sm"
              />
            </div>

            <OptionalQuestionnaire
              onComplete={handleQuestionnaireComplete}
              onSkip={handleQuestionnaireSkip}
            />
          </div>
        )}

        {/* === フェーズ3: 診断結果 === */}
        {phase === 'result' && diagnosticResult && (
          <div className="w-full space-y-8">
            <DiagnosticResult
              result={diagnosticResult}
              onRetake={handleReset}
            />

            {/* 診断結果の最下部：もう一度診断するボタン（ユーザー要望対応） */}
            <div className="pt-4 pb-12 flex flex-col items-center justify-center gap-3">
              <button
                onClick={handleReset}
                className="px-8 py-4 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-full font-bold text-base shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2.5 cursor-pointer"
              >
                <FontAwesomeIcon icon={faRotateRight} className="w-4 h-4" />
                <span>もう一度診断する（別の写真で試す）</span>
              </button>
              <p className="text-xs text-slate-500">
                手のひら側や別の場所、白補正を変えて試してみることもできます
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 四季パレット図鑑モーダル */}
      <PaletteGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* フッター */}
      <footer className="w-full border-t border-slate-200/60 bg-white/60 backdrop-blur-xs py-6 text-center text-xs text-slate-500 space-y-2 mt-auto">
        <div className="flex items-center justify-center gap-3">
          <a
            href="https://mofu-mitsu.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-rose-600 underline font-medium"
          >
            ホームへ戻る
          </a>
          <span>•</span>
          <button
            onClick={() => setIsGuideOpen(true)}
            className="hover:text-rose-600 underline cursor-pointer"
          >
            四季パレット図鑑
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          四季色 (COLOR SEASONS) — 手肌の色彩測定に基づくパーソナルカラー分析システム
        </p>
      </footer>
    </div>
  );
}
