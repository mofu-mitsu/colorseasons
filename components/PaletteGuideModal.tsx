'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SeasonType, SEASONS_DATA } from '@/lib/color-analysis';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPalette, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import RiekoBird from './RiekoBird';

interface PaletteGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaletteGuideModal({ isOpen, onClose }: PaletteGuideModalProps) {
  const [activeTab, setActiveTab] = useState<SeasonType>('spring');

  if (!isOpen) return null;

  const current = SEASONS_DATA[activeTab];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* モーダルヘッダー */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faPalette} className="text-rose-500" />
              <h2 className="text-lg font-bold text-slate-800">
                四季パレット図鑑（4シーズン一覧）
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
          </div>

          {/* シーズン切り替えタブ */}
          <div className="grid grid-cols-4 p-2 bg-slate-100/70 border-b border-slate-200/70 gap-1 sm:gap-2">
            {(['spring', 'summer', 'autumn', 'winter'] as const).map((s) => {
              const info = SEASONS_DATA[s];
              const isSelected = activeTab === s;
              return (
                <button
                  key={s}
                  onClick={() => setActiveTab(s)}
                  className={`py-2 px-1 sm:px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <span className="text-base sm:text-sm">
                    {s === 'spring' ? '🌸' : s === 'summer' ? '🫧' : s === 'autumn' ? '🍁' : '❄️'}
                  </span>
                  <span>{info.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* コンテンツエリア */}
          <div className="p-6 overflow-y-auto space-y-6">
            <div className={`p-5 rounded-2xl border ${current.borderColor} ${current.cardBg}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-slate-800 shadow-2xs">
                    {current.undertone}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">
                    {current.name}
                  </h3>
                  <p className="text-sm font-semibold text-slate-700">
                    “ {current.subTitle} ”
                  </p>
                </div>

                <RiekoBird
                  season={activeTab}
                  message={current.riekoComment}
                  size="sm"
                  showSpeechBubble={false}
                />
              </div>

              <p className="text-xs sm:text-sm text-slate-700 mt-3 leading-relaxed">
                {current.atmosphere}
              </p>
            </div>

            {/* パレット12色 */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faPalette} className="text-rose-500" />
                <span>代表的な12色パレット</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {current.palette.map((col) => (
                  <div
                    key={col.name}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center gap-3"
                  >
                    <div
                      style={{ backgroundColor: col.hex }}
                      className="w-9 h-9 rounded-lg shadow-2xs border border-black/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {col.name.split(' ')[0]}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {col.hex}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* キーワード */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
              <span className="font-bold text-slate-700">おすすめカラーキーワード：</span>{' '}
              <span className="text-slate-600">{current.keywords.join('、')}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
