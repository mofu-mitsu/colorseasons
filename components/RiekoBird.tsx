'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SeasonType } from '@/lib/color-analysis';
import { Sparkles, Heart } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFeather, faCommentDots } from '@fortawesome/free-solid-svg-icons';

interface RiekoBirdProps {
  message?: string;
  season?: SeasonType | null;
  pose?: 'idle' | 'pointing' | 'happy' | 'thinking' | 'celebrating';
  size?: 'sm' | 'md' | 'lg';
  showSpeechBubble?: boolean;
}

export default function RiekoBird({
  message,
  season,
  pose = 'idle',
  size = 'md',
  showSpeechBubble = true,
}: RiekoBirdProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isSinging, setIsSinging] = useState(false);

  // 定期的な瞬きアニメーション
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 4000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // クリック時のちょっとしたアクション
  const handleClick = () => {
    setIsSinging(true);
    setTimeout(() => setIsSinging(false), 2000);
  };

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-28 h-28',
    lg: 'w-36 h-36',
  };

  // デフォルトのセリフ
  const defaultMessage = message || (
    season === 'spring' ? '春のやわらかな月明かりと桜……とてもお似合いです🌸' :
    season === 'summer' ? '水面に夕暮れが溶けるような夏の色。わたしも大好きな色です🫧' :
    season === 'autumn' ? '水彩の紅葉のような深みと温もり。しっとり落ち着いて素敵です🍁' :
    season === 'winter' ? '白銀に凍りつく花のようなドラマティックな冴え色ですね❄️' :
    'こんにちは、りえこです。あなたの肌色から、四季のパレットを案内いたしますね。'
  );

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 relative select-none w-full max-w-full justify-center sm:justify-end">
      {/* 吹き出し */}
      {showSpeechBubble && (
        <AnimatePresence mode="wait">
          <motion.div
            key={defaultMessage}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative bg-white/95 backdrop-blur-md px-3.5 sm:px-4 py-3 rounded-2xl shadow-lg border border-rose-200/80 w-full sm:w-auto max-w-full sm:max-w-xs md:max-w-sm text-xs sm:text-sm text-slate-700 order-2 sm:order-1 break-words"
          >
            <div className="flex items-center gap-1.5 mb-1 text-[11px] font-medium text-rose-500 tracking-wider">
              <FontAwesomeIcon icon={faFeather} className="w-3 h-3 text-rose-400 shrink-0" />
              <span className="truncate">案内役 りえこ（オオマシコ）</span>
              <span className="text-[10px] text-slate-400 font-normal shrink-0">※たぶんブルベ夏</span>
            </div>
            <p className="leading-relaxed font-sans break-words">{defaultMessage}</p>

            {/* 吹き出しの三角ヒゲ */}
            <div className="hidden sm:block absolute right-[-8px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-white/95" />
            <div className="sm:hidden absolute top-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent border-b-6 border-b-white/95" />
          </motion.div>
        </AnimatePresence>
      )}

      {/* りえこちゃん本体（オオマシコ SVG） */}
      <motion.div
        onClick={handleClick}
        className={`relative cursor-pointer shrink-0 order-1 sm:order-2 ${sizeClasses[size]}`}
        animate={
          pose === 'celebrating' || isSinging
            ? { y: [0, -12, 0], rotate: [-2, 4, -2, 0] }
            : { y: [0, -4, 0] }
        }
        transition={{
          duration: pose === 'celebrating' ? 1.4 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        title="案内役のりえこ（オオマシコ）です。タップすると挨拶してくれますよ。"
      >
        {/* 音符やハートが飛び出すエフェクト */}
        <AnimatePresence>
          {isSinging && (
            <>
              <motion.div
                initial={{ opacity: 1, y: 0, x: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -28, x: -16, scale: 1.2 }}
                exit={{ opacity: 0 }}
                className="absolute -top-3 -left-2 text-rose-400 pointer-events-none"
              >
                <Heart className="w-5 h-5 fill-rose-300 stroke-rose-400" />
              </motion.div>
              <motion.div
                initial={{ opacity: 1, y: 0, x: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -34, x: 14, scale: 1.2 }}
                exit={{ opacity: 0 }}
                className="absolute -top-4 -right-1 text-amber-400 pointer-events-none"
              >
                <Sparkles className="w-5 h-5 fill-amber-300 stroke-amber-400" />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* オオマシコ（Long-tailed Rosefinch）の美麗SVG */}
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full drop-shadow-md overflow-visible"
        >
          <defs>
            {/* 羽毛のグラデーション（オオマシコ特有のローズピンク〜ワインルビー） */}
            <linearGradient id="rosefinchBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FB7185" /> {/* ローズピンク */}
              <stop offset="60%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#BE123C" />
            </linearGradient>

            {/* お腹のふんわりシルバーピンク */}
            <linearGradient id="rosefinchBelly" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE4E6" />
              <stop offset="100%" stopColor="#FECDD3" />
            </linearGradient>

            {/* 頭頂部の銀白色の羽冠（オオマシコの特徴） */}
            <linearGradient id="silverCrown" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>

            {/* 翼のチャコールグレー＆ホワイトバー */}
            <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
          </defs>

          {/* 止まり木またはふんわり台座 */}
          <ellipse cx="80" cy="148" rx="42" ry="7" fill="rgba(0,0,0,0.08)" />

          {/* 長い尾羽（Long-tailed Rosefinchの名残） */}
          <motion.path
            d="M 68 116 L 42 152 C 40 155 45 157 48 154 L 75 120 Z"
            fill="#334155"
            animate={isSinging ? { rotate: [-5, 5, -5] } : {}}
            transition={{ duration: 0.5, repeat: 2 }}
          />
          <path
            d="M 72 118 L 52 150 C 50 153 54 155 57 152 L 77 121 Z"
            fill="#E2E8F0"
          />

          {/* まあるい体（Rosefinch Body） */}
          <circle cx="82" cy="85" r="42" fill="url(#rosefinchBody)" />

          {/* お腹のやわらかなピンク */}
          <ellipse cx="88" cy="94" rx="28" ry="30" fill="url(#rosefinchBelly)" />

          {/* 頭部の銀白色の冠羽模様（オオマシコ雄のチャームポイント） */}
          <path
            d="M 62 56 Q 78 40 102 50 Q 86 52 70 66 Z"
            fill="url(#silverCrown)"
            opacity="0.9"
          />
          <circle cx="75" cy="52" r="3" fill="#FFFFFF" opacity="0.8" />
          <circle cx="83" cy="48" r="2.5" fill="#FFFFFF" opacity="0.8" />

          {/* 翼（羽） */}
          <motion.g
            animate={
              isSinging || pose === 'celebrating'
                ? { rotate: [-10, 15, -10], y: [-2, 3, -2] }
                : {}
            }
            transition={{ duration: 0.4, repeat: isSinging ? 4 : 0 }}
          >
            {/* 翼基部 */}
            <path
              d="M 52 76 C 50 96 66 122 84 116 C 92 112 88 90 74 76 Z"
              fill="url(#wingGradient)"
            />
            {/* 翼の白いバンド（縞模様） */}
            <path
              d="M 58 86 Q 70 94 80 90"
              stroke="#F8FAFC"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 62 96 Q 74 102 82 98"
              stroke="#FDA4AF"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </motion.g>

          {/* つぶらな黒い瞳 */}
          <g>
            {isBlinking ? (
              // まばたき（閉じた目）
              <path
                d="M 96 68 Q 102 71 108 68"
                stroke="#1E293B"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              // 開いた目（キラキラハイライト付き）
              <>
                <circle cx="102" cy="68" r="5" fill="#0F172A" />
                <circle cx="103.5" cy="66.5" r="1.8" fill="#FFFFFF" />
                <circle cx="100.5" cy="69.5" r="0.9" fill="#FFFFFF" />
              </>
            )}
          </g>

          {/* ちいさなくちばし（円錐形の太めの嘴） */}
          <polygon
            points="108,68 122,73 108,78"
            fill="#E2E8F0"
            stroke="#94A3B8"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />

          {/* ほっぺのぽっとした赤み */}
          <ellipse cx="94" cy="76" rx="6" ry="3.5" fill="#FDA4AF" opacity="0.6" />

          {/* 足 */}
          <path
            d="M 76 125 L 72 138 M 72 138 L 66 140 M 72 138 L 72 142 M 72 138 L 78 141"
            stroke="#E2E8F0"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M 88 125 L 86 138 M 86 138 L 80 140 M 86 138 L 86 142 M 86 138 L 92 141"
            stroke="#E2E8F0"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
    </div>
  );
}
