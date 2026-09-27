'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RGB, calibrateRGB, rgbToHex, rgbToOklch } from '@/lib/color-analysis';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCamera,
  faUpload,
  faEyeDropper,
  faCheck,
  faSun,
  faArrowRotateLeft,
  faCircleQuestion,
  faCrosshairs,
} from '@fortawesome/free-solid-svg-icons';
import { Sparkles, AlertCircle, RefreshCw, ZoomIn } from 'lucide-react';

interface HandColorScannerProps {
  onColorDetected: (rgb: RGB, calibratedRGB: RGB | null, previewDataUrl?: string) => void;
  isProcessing?: boolean;
}

export default function HandColorScanner({
  onColorDetected,
  isProcessing = false,
}: HandColorScannerProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [detectedSkinColor, setDetectedSkinColor] = useState<RGB | null>(null);
  const [whiteRefColor, setWhiteRefColor] = useState<RGB | null>(null);
  const [calibratedColor, setCalibratedColor] = useState<RGB | null>(null);
  const [dropperMode, setDropperMode] = useState<'skin' | 'white' | null>(null);
  const [magnifierPos, setMagnifierPos] = useState<{ x: number; y: number; colorHex: string } | null>(null);
  const [samplePoints, setSamplePoints] = useState<{ x: number; y: number }[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageDisplayRef = useRef<HTMLImageElement | null>(null);

  // カメラの起動
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera access error, fallback to file upload:', err);
      fileInputRef.current?.click();
    }
  };

  // カメラの停止
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  }, []);

  // カメラからの撮影
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();
    processImage(dataUrl);
  };

  // ファイルアップロードハンドラ
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      processImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // 画像の自動サンプリング処理（超高速ブラウザ内Canvas解析）
  const processImage = (src: string) => {
    setImageSrc(src);
    setWhiteRefColor(null);
    setCalibratedColor(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = img.naturalWidth || 600;
      canvas.height = img.naturalHeight || 600;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 手の甲・手のひらを想定した中央寄り複数ポイントのサンプリング
      // 中央部 (50%, 50%), やや上 (50%, 40%), やや下 (50%, 60%), やや左 (42%, 48%), やや右 (58%, 48%)
      const cw = canvas.width;
      const ch = canvas.height;

      const points = [
        { x: Math.round(cw * 0.50), y: Math.round(ch * 0.48) },
        { x: Math.round(cw * 0.50), y: Math.round(ch * 0.38) },
        { x: Math.round(cw * 0.50), y: Math.round(ch * 0.58) },
        { x: Math.round(cw * 0.44), y: Math.round(ch * 0.46) },
        { x: Math.round(cw * 0.56), y: Math.round(ch * 0.46) },
        { x: Math.round(cw * 0.48), y: Math.round(ch * 0.52) },
      ];
      setSamplePoints(points);

      const colorSamples: RGB[] = [];

      points.forEach((pt) => {
        // 各ポイント周辺の5x5ピクセルの平均を取得してノイズを抑制
        const pSize = 5;
        const startX = Math.max(0, pt.x - 2);
        const startY = Math.max(0, pt.y - 2);
        const imgData = ctx.getImageData(startX, startY, pSize, pSize);
        const data = imgData.data;

        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          rSum += data[i];
          gSum += data[i + 1];
          bSum += data[i + 2];
          count++;
        }
        if (count > 0) {
          colorSamples.push({
            r: Math.round(rSum / count),
            g: Math.round(gSum / count),
            b: Math.round(bSum / count),
          });
        }
      });

      // 極端な外れ値（暗すぎる影、テカリなど）を除外し中央値付近を算出
      colorSamples.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
      const mid = Math.floor(colorSamples.length / 2);
      const medianColor = colorSamples[mid] || { r: 215, g: 175, b: 160 };

      setDetectedSkinColor(medianColor);
    };
    img.src = src;
  };

  // スポイトタップハンドラ
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!dropperMode || !imageDisplayRef.current || !canvasRef.current) return;

    const img = imageDisplayRef.current;
    const rect = img.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 表示サイズから元画像Canvas座標へ変換
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const canvasX = Math.round(clickX * scaleX);
    const canvasY = Math.round(clickY * scaleY);

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // 周辺3x3の平均色を取得
    const imgData = ctx.getImageData(Math.max(0, canvasX - 1), Math.max(0, canvasY - 1), 3, 3);
    const data = imgData.data;
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
      count++;
    }

    const pickedRGB: RGB = {
      r: Math.round(rSum / count),
      g: Math.round(gSum / count),
      b: Math.round(bSum / count),
    };

    if (dropperMode === 'skin') {
      setDetectedSkinColor(pickedRGB);
      if (whiteRefColor) {
        setCalibratedColor(calibrateRGB(pickedRGB, whiteRefColor));
      }
      setDropperMode(null);
    } else if (dropperMode === 'white') {
      setWhiteRefColor(pickedRGB);
      if (detectedSkinColor) {
        setCalibratedColor(calibrateRGB(detectedSkinColor, pickedRGB));
      }
      setDropperMode(null);
    }
  };

  // スポイト中のマウス/タッチ移動（ルーペ表示）
  const handleImageMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!dropperMode || !imageDisplayRef.current || !canvasRef.current) {
      setMagnifierPos(null);
      return;
    }

    const img = imageDisplayRef.current;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const canvasX = Math.round(x * scaleX);
    const canvasY = Math.round(y * scaleY);

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
    const colorHex = rgbToHex({ r: pixel[0], g: pixel[1], b: pixel[2] });

    setMagnifierPos({ x, y, colorHex });
  };

  // 確定ボタン
  const handleConfirm = () => {
    if (!detectedSkinColor) return;
    onColorDetected(detectedSkinColor, calibratedColor, imageSrc || undefined);
  };

  // 終了時にカメラ停止
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const activeColor = calibratedColor || detectedSkinColor;
  const activeOklch = activeColor ? rgbToOklch(activeColor) : null;

  return (
    <div className="w-full bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-8 shadow-xl border border-rose-100 max-w-2xl mx-auto transition-all">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100/70 text-rose-800 text-xs font-semibold rounded-full mb-2">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>手の肌色 × OKLCH 瞬間色彩解析</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
          手の写真を撮影・アップロード
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          顔写真を使わず、手の甲や手のひらの色からパーソナルカラーを判定。画像はサーバーに保存されず、ブラウザ内で即時に解析されます。
        </p>
      </div>

      {/* カメラ表示中 */}
      {cameraActive && (
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-rose-400 aspect-4/3 flex items-center justify-center mb-6 shadow-inner">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          
          {/* ガイド枠 */}
          <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-white/80 rounded-2xl pointer-events-none flex flex-col items-center justify-center text-white/90 text-sm font-medium drop-shadow-md">
            <span className="text-4xl mb-2">🖐️</span>
            <span>枠の中に手の甲または手のひらを合わせてね</span>
          </div>

          {/* カメラ操作バー */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
            <button
              onClick={capturePhoto}
              className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <FontAwesomeIcon icon={faCamera} className="w-4 h-4" />
              <span>シャッターを押す</span>
            </button>
            <button
              onClick={stopCamera}
              className="px-4 py-3 bg-white/80 hover:bg-white text-slate-700 rounded-full font-medium text-sm transition-all cursor-pointer"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 画像プレビュー＆解析画面 */}
      {imageSrc && !cameraActive && (
        <div className="space-y-4 mb-6">
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 aspect-4/3 max-h-[380px] flex items-center justify-center select-none shadow-inner">
            <img
              ref={imageDisplayRef}
              src={imageSrc}
              alt="Uploaded Hand Preview"
              onClick={handleImageClick}
              onMouseMove={handleImageMouseMove}
              onMouseLeave={() => setMagnifierPos(null)}
              className={`w-full h-full object-contain ${
                dropperMode ? 'cursor-crosshair' : 'cursor-default'
              }`}
            />

            {/* スポイトルーペ表示 */}
            {magnifierPos && dropperMode && (
              <div
                style={{
                  left: magnifierPos.x + 15,
                  top: magnifierPos.y - 45,
                }}
                className="absolute pointer-events-none z-30 flex items-center gap-2 bg-slate-900/90 text-white px-2.5 py-1.5 rounded-full text-xs shadow-xl backdrop-blur-xs border border-white/40"
              >
                <div
                  style={{ backgroundColor: magnifierPos.colorHex }}
                  className="w-4 h-4 rounded-full border border-white shadow-2xs"
                />
                <span className="font-mono text-[11px] font-bold">{magnifierPos.colorHex}</span>
              </div>
            )}

            {/* スポイトモード中のガイドオーバーレイ */}
            {dropperMode && (
              <div className="absolute top-3 left-3 right-3 bg-slate-900/85 backdrop-blur-md text-white text-xs py-2 px-3 rounded-xl flex items-center justify-between shadow-lg border border-white/20">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faEyeDropper} className="text-rose-400 animate-pulse" />
                  <span>
                    {dropperMode === 'skin'
                      ? '画像内の【手の肌色】をタップして選択してください'
                      : '画像内の【白い紙や白い背景】をタップしてください'}
                  </span>
                </div>
                <button
                  onClick={() => setDropperMode(null)}
                  className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>

          {/* 検出色プレビュー ＆ スポイトツール */}
          {detectedSkinColor && (
            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* 測定された色 */}
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: rgbToHex(detectedSkinColor) }}
                    className="w-12 h-12 rounded-xl shadow-md border-2 border-white ring-1 ring-slate-200 shrink-0"
                    title={`肌色: ${rgbToHex(detectedSkinColor)}`}
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>抽出された肌色</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono">
                        {rgbToHex(detectedSkinColor)}
                      </span>
                    </div>
                    {activeOklch && (
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        L: {(activeOklch.l * 100).toFixed(1)}% | C: {activeOklch.c.toFixed(3)} | H: {activeOklch.h.toFixed(1)}°
                      </div>
                    )}
                  </div>
                </div>

                {/* スポイト調整ボタン */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDropperMode('skin')}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 border cursor-pointer ${
                      dropperMode === 'skin'
                        ? 'bg-rose-500 text-white border-rose-600'
                        : 'bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600 border-slate-200'
                    }`}
                    title="写真上の好きな肌色位置をタップして選び直す"
                  >
                    <FontAwesomeIcon icon={faEyeDropper} className="w-3 h-3" />
                    <span>肌色スポイト</span>
                  </button>

                  <button
                    onClick={() => setDropperMode('white')}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 border cursor-pointer ${
                      dropperMode === 'white'
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 border-slate-200'
                    }`}
                    title="照明の色かぶり（電球色・黄色み）を白基準で補正"
                  >
                    <FontAwesomeIcon icon={faSun} className="w-3 h-3 text-amber-500" />
                    <span>白補正(任意)</span>
                  </button>
                </div>
              </div>

              {/* ホワイトバランス補正が適用されている場合 */}
              {calibratedColor && whiteRefColor && (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                    白基準（{rgbToHex(whiteRefColor)}）による照明補正を適用しました
                  </span>
                  <button
                    onClick={() => {
                      setCalibratedColor(null);
                      setWhiteRefColor(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 ml-2"
                  >
                    解除
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 撮り直し & 決定ボタン */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                setImageSrc(null);
                setDetectedSkinColor(null);
                setCalibratedColor(null);
              }}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FontAwesomeIcon icon={faArrowRotateLeft} className="w-3 h-3" />
              <span>別の写真にする</span>
            </button>

            <button
              onClick={handleConfirm}
              disabled={!detectedSkinColor || isProcessing}
              className="flex-1 max-w-xs px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-full font-bold text-sm shadow-md transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>色彩解析中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>この手肌色で診断する</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 初期状態（カメラ / 写真アップロードの選択） */}
      {!imageSrc && !cameraActive && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* カメラボタン */}
            <button
              onClick={startCamera}
              className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed border-rose-200 hover:border-rose-400 bg-rose-50/40 hover:bg-rose-50 transition-all group cursor-pointer shadow-2xs"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                <FontAwesomeIcon icon={faCamera} className="w-6 h-6" />
              </div>
              <span className="font-bold text-slate-800 text-sm sm:text-base">
                カメラで手を撮影
              </span>
              <span className="text-xs text-slate-500 mt-1">
                その場でサッと撮影して即判定
              </span>
            </button>

            {/* 写真選択ボタン */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100/70 transition-all group cursor-pointer shadow-2xs"
            >
              <div className="w-14 h-14 rounded-full bg-slate-700 text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                <FontAwesomeIcon icon={faUpload} className="w-6 h-6" />
              </div>
              <span className="font-bold text-slate-800 text-sm sm:text-base">
                写真ライブラリから選ぶ
              </span>
              <span className="text-xs text-slate-500 mt-1">
                撮影済みの手の写真を読み込む
              </span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* サンプルで今すぐ体験 */}
          <div className="pt-2 text-center">
            <div className="text-xs text-slate-500 mb-2 font-medium">
              写真がない方はこちらから各シーズンのサンプル手肌色で試せます
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* 春 (Spring) */}
              <button
                type="button"
                onClick={() => {
                  const sampleRGB: RGB = { r: 240, g: 198, b: 160 }; // イエベ春 (ピーチアイボリー)
                  setDetectedSkinColor(sampleRGB);
                  const canvas = canvasRef.current || document.createElement('canvas');
                  canvas.width = 400;
                  canvas.height = 300;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#F3F4F6';
                    ctx.fillRect(0, 0, 400, 300);
                    ctx.fillStyle = 'rgb(240, 198, 160)';
                    ctx.beginPath();
                    ctx.ellipse(200, 150, 110, 80, 0, 0, Math.PI * 2);
                    ctx.fill();
                    setImageSrc(canvas.toDataURL());
                  }
                }}
                className="px-2.5 py-2 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="イエベ春の代表的な手肌色サンプル"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#F0C6A0] border border-black/10 shrink-0" />
                <span>🌸 春 (ピーチ肌)</span>
              </button>

              {/* 夏 (Summer) */}
              <button
                type="button"
                onClick={() => {
                  const sampleRGB: RGB = { r: 218, g: 174, b: 168 }; // ブルベ夏 (ソフトピンクベージュ)
                  setDetectedSkinColor(sampleRGB);
                  const canvas = canvasRef.current || document.createElement('canvas');
                  canvas.width = 400;
                  canvas.height = 300;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#F3F4F6';
                    ctx.fillRect(0, 0, 400, 300);
                    ctx.fillStyle = 'rgb(218, 174, 168)';
                    ctx.beginPath();
                    ctx.ellipse(200, 150, 110, 80, 0, 0, Math.PI * 2);
                    ctx.fill();
                    setImageSrc(canvas.toDataURL());
                  }
                }}
                className="px-2.5 py-2 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="ブルベ夏の代表的な手肌色サンプル"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#DAAEA8] border border-black/10 shrink-0" />
                <span>🫧 夏 (ピンク肌)</span>
              </button>

              {/* 秋 (Autumn) */}
              <button
                type="button"
                onClick={() => {
                  const sampleRGB: RGB = { r: 188, g: 142, b: 104 }; // イエベ秋 (ゴールデンオークル)
                  setDetectedSkinColor(sampleRGB);
                  const canvas = canvasRef.current || document.createElement('canvas');
                  canvas.width = 400;
                  canvas.height = 300;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#F3F4F6';
                    ctx.fillRect(0, 0, 400, 300);
                    ctx.fillStyle = 'rgb(188, 142, 104)';
                    ctx.beginPath();
                    ctx.ellipse(200, 150, 110, 80, 0, 0, Math.PI * 2);
                    ctx.fill();
                    setImageSrc(canvas.toDataURL());
                  }
                }}
                className="px-2.5 py-2 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="イエベ秋の代表的な手肌色サンプル"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#BC8E68] border border-black/10 shrink-0" />
                <span>🍁 秋 (オークル肌)</span>
              </button>

              {/* 冬 (Winter) */}
              <button
                type="button"
                onClick={() => {
                  const sampleRGB: RGB = { r: 220, g: 156, b: 172 }; // ブルベ冬 (ルビーピンク・コントラスト)
                  setDetectedSkinColor(sampleRGB);
                  const canvas = canvasRef.current || document.createElement('canvas');
                  canvas.width = 400;
                  canvas.height = 300;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#F3F4F6';
                    ctx.fillRect(0, 0, 400, 300);
                    ctx.fillStyle = 'rgb(220, 156, 172)';
                    ctx.beginPath();
                    ctx.ellipse(200, 150, 110, 80, 0, 0, Math.PI * 2);
                    ctx.fill();
                    setImageSrc(canvas.toDataURL());
                  }
                }}
                className="px-2.5 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="ブルベ冬の代表的な手肌色サンプル"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#DC9CAC] border border-black/10 shrink-0" />
                <span>❄️ 冬 (クール肌)</span>
              </button>
            </div>
          </div>

          {/* 撮影のコツ案内カード */}
          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/70 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <FontAwesomeIcon icon={faSun} className="w-3.5 h-3.5 text-amber-600" />
              <span>より正確に診断するための撮影のコツ</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed pl-1">
              <li>☀️ <strong>自然光・明るい室内</strong>（直射日光や強い電球光を避ける）</li>
              <li>🚫 <strong>フィルター・加工なし</strong>のそのままの写真が最適です</li>
              <li>🤍 白いコピー用紙やハンカチを手の横に添えると、白補正で精度がさらにアップ！</li>
            </ul>
          </div>
        </div>
      )}

      {/* 非表示Canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
