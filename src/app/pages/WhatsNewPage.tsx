import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Crown, ArrowLeft, Sparkles, History } from 'lucide-react';
import { VERSION_HISTORY } from '../data/versionHistory';

const APP_VERSION = '0.7.1';
export const WHATS_NEW_SEEN_KEY = 'palace-whats-new-seen';
export { APP_VERSION };

export default function WhatsNewPage() {
  const navigate = useNavigate();
  const latest = VERSION_HISTORY[0];

  // Mark as seen when this page is opened
  useEffect(() => {
    try { localStorage.setItem(WHATS_NEW_SEEN_KEY, APP_VERSION); } catch { /* ignore */ }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-green-900/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-lg">What's New in v{APP_VERSION}</span>
        </div>
        <div className="w-8 h-8 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg shrink-0">
          <Crown className="w-4 h-4 text-yellow-900" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-3 pb-16">
        {/* Version banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-yellow-300">
            <span className="text-lg">🚀</span> Palace Royale v{APP_VERSION}
          </div>
          <p className="text-sm text-yellow-100 leading-relaxed">
            {latest.summary}
          </p>
        </div>

        {/* Latest version feature content */}
        <latest.Content />

        {/* Version History link */}
        <button
          onClick={() => navigate('/version-log')}
          className="flex items-center gap-3 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 active:scale-[0.98] transition-all"
        >
          <History className="w-5 h-5 text-green-400 shrink-0" />
          <div className="text-left flex-1">
            <div className="font-semibold text-sm text-white">Version History</div>
            <div className="text-xs text-green-400">See all past releases</div>
          </div>
          <span className="text-green-500 text-sm">→</span>
        </button>

        {/* CTA */}
        <div className="pt-2">
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-yellow-500 text-black rounded-2xl font-bold text-lg hover:bg-yellow-400 active:scale-[0.98] transition-all shadow-lg shadow-yellow-500/20"
          >
            Let's Play! →
          </button>
        </div>
      </div>
    </div>
  );
}
