'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faXmark,
  faCheck,
  faHandPointer,
  faShareNodes,
} from '@fortawesome/free-solid-svg-icons';

interface ResultImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  seasonName: string;
}

export default function ResultImageModal({
  isOpen,
  onClose,
  imageUrl,
  seasonName,
}: ResultImageModalProps) {
  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `四季色_パーソナルカラー診断_${seasonName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    try {
      // DataURL を Blob に変換して File として共有を試みる
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `四季色_${seasonName}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '四季色 パーソナルカラー診断結果',
          text: `私のパーソナルカラーは【${seasonName}】でした！🌸🫧🍁❄️ #四季色 #パーソナルカラー診断`,
        });
        return;
      }
    } catch (e) {
      console.warn('Native file share fallback:', e);
    }

    // 通常のダウンロードを実行
    handleDownload();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* ヘッダー */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                診断結果カード（画像保存）
              </h3>
              <p className="text-[11px] text-slate-500">
                スマートフォンでは画像を長押ししても保存できます
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
          </div>

          {/* 画像プレビューエリア */}
          <div className="p-4 sm:p-6 overflow-y-auto flex flex-col items-center justify-center bg-slate-100/60">
            <div className="relative group max-w-sm w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
              <img
                src={imageUrl}
                alt="診断結果カード"
                className="w-full h-auto object-contain select-none"
              />
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 bg-white/80 px-3 py-1.5 rounded-full border border-slate-200">
              <FontAwesomeIcon icon={faHandPointer} className="text-rose-500" />
              <span>スマホの方は上の画像を<strong>「長押し」</strong>して写真に保存できます</span>
            </div>
          </div>

          {/* アクションフッター */}
          <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleDownload}
              className="w-full sm:w-auto flex-1 px-5 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-full font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
              <span>画像（PNG）をダウンロード</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleShare}
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <FontAwesomeIcon icon={faShareNodes} className="w-4 h-4" />
                <span>共有する</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
