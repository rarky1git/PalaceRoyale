import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Crown, ArrowLeft, History, ChevronDown, ChevronUp } from 'lucide-react';
import { VERSION_HISTORY } from '../data/versionHistory';

export default function VersionLogPage() {
  const navigate = useNavigate();
  // Track which version entries are expanded; the latest is open by default
  const [expanded, setExpanded] = useState<Set<string>>(new Set([VERSION_HISTORY[0].version]));

  const toggle = (version: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(version)) { next.delete(version); } else { next.add(version); }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-green-900/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <History className="w-5 h-5 text-green-400" />
          <span className="font-bold text-lg">Version History</span>
        </div>
        <div className="w-8 h-8 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg shrink-0">
          <Crown className="w-4 h-4 text-yellow-900" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-3 pb-16">
        {/* Intro */}
        <p className="text-sm text-green-300 text-center">
          All Palace Royale releases — newest first.
        </p>

        {VERSION_HISTORY.map((entry, i) => {
          const isOpen = expanded.has(entry.version);
          const isLatest = i === 0;
          return (
            <div
              key={entry.version}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* Version header row */}
              <button
                onClick={() => toggle(entry.version)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:scale-[0.99] transition-all"
              >
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">v{entry.version}</span>
                    {isLatest && (
                      <span className="text-[10px] font-bold bg-yellow-500 text-black px-1.5 py-0.5 rounded-full">
                        LATEST
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-green-400 mt-0.5">{entry.date} · {entry.summary}</div>
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-green-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-green-400 shrink-0" />
                }
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                  <entry.Content />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
