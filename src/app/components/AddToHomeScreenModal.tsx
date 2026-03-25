import { useState, useEffect } from 'react';
import { X, Share, Plus, MoreVertical } from 'lucide-react';

const STORAGE_KEY = 'palace-hide-add-to-home';

function detectOS(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function isMobileBrowser(): boolean {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent);
}

export function AddToHomeScreenModal() {
  const [visible, setVisible] = useState(false);
  const os = detectOS();

  useEffect(() => {
    // Only show on mobile browsers, not when already installed as PWA
    if (!isMobileBrowser()) return;
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch (e) { console.warn('AddToHomeScreen: localStorage read failed', e); }
    // Small delay so it doesn't appear immediately on load
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = (permanent?: boolean) => {
    setVisible(false);
    if (permanent) {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) { console.warn('AddToHomeScreen: localStorage write failed', e); }
    }
  };

  if (!visible) return null;

  const instructionsUrl =
    os === 'ios'
      ? 'https://support.apple.com/guide/iphone/bookmark-favorite-webpages-iph42ab2f3a7/ios#iph4f9a47bbc'
      : os === 'android'
      ? 'https://support.google.com/chrome/answer/9658361'
      : undefined;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => dismiss()}
    >
      <div
        className="w-full max-w-sm bg-gradient-to-b from-green-900 to-green-800 rounded-2xl border border-white/20 shadow-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-white text-base">Add to Home Screen</span>
          <button
            onClick={() => dismiss()}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Icon + description */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <span className="text-2xl">👑</span>
          </div>
          <p className="text-sm text-green-200 leading-snug">
            Install Palace Royale for the best experience — play offline, full screen, and no browser chrome!
          </p>
        </div>

        {/* OS-specific instructions */}
        {os === 'ios' && (
          <div className="bg-white/10 rounded-xl p-3 space-y-2 text-sm text-green-100">
            <p className="font-semibold text-white">How to install on iPhone / iPad:</p>
            <ol className="space-y-1 text-xs leading-relaxed list-none">
              <li className="flex items-center gap-2">
                <Share className="w-4 h-4 shrink-0 text-blue-300" />
                <span>Tap the <strong className="text-white">Share</strong> button in Safari</span>
              </li>
              <li className="flex items-center gap-2">
                <Plus className="w-4 h-4 shrink-0 text-green-300" />
                <span>Tap <strong className="text-white">Add to Home Screen</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 shrink-0 text-center text-white font-bold">✓</span>
                <span>Tap <strong className="text-white">Add</strong> to confirm</span>
              </li>
            </ol>
          </div>
        )}

        {os === 'android' && (
          <div className="bg-white/10 rounded-xl p-3 space-y-2 text-sm text-green-100">
            <p className="font-semibold text-white">How to install on Android:</p>
            <ol className="space-y-1 text-xs leading-relaxed list-none">
              <li className="flex items-center gap-2">
                <MoreVertical className="w-4 h-4 shrink-0 text-blue-300" />
                <span>Tap the <strong className="text-white">⋮ menu</strong> in Chrome</span>
              </li>
              <li className="flex items-center gap-2">
                <Plus className="w-4 h-4 shrink-0 text-green-300" />
                <span>Tap <strong className="text-white">Add to Home screen</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 shrink-0 text-center text-white font-bold">✓</span>
                <span>Tap <strong className="text-white">Add</strong> to confirm</span>
              </li>
            </ol>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          {instructionsUrl && (
            <a
              href={instructionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 bg-yellow-500 text-black rounded-xl font-bold text-sm text-center hover:bg-yellow-400 active:scale-[0.98] transition-all"
            >
              View Instructions
            </a>
          )}
          <button
            onClick={() => dismiss(true)}
            className="flex-1 py-2.5 bg-white/10 text-green-200 rounded-xl font-bold text-sm hover:bg-white/20 active:scale-[0.98] transition-all"
          >
            Don't show again
          </button>
        </div>
      </div>
    </div>
  );
}
