import { useState } from 'react';
import { useNavigate } from 'react-router';
import { X, Settings, Volume2, VolumeX, Music, Music2, Maximize, Minimize, Sparkles, Bug, GraduationCap, Lightbulb, History, Download, Upload } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import type { GameSettings } from '../contexts/SettingsContext';
import { TUTORIAL_SEEN_KEY } from './TutorialOverlay';
import type { PlayerStats } from '../game-engine';

const STATS_KEY = 'palace-stats';

function encodeStats(stats: PlayerStats): string {
  try {
    return btoa(JSON.stringify(stats));
  } catch {
    return '';
  }
}

function decodeStats(input: string): PlayerStats | null {
  try {
    const parsed = JSON.parse(atob(input.trim())) as Record<string, unknown>;
    const { gold, silver, bronze, losses, gamesPlayed } = parsed;
    if (
      typeof gold === 'number' && gold >= 0 &&
      typeof silver === 'number' && silver >= 0 &&
      typeof bronze === 'number' && bronze >= 0 &&
      typeof losses === 'number' && losses >= 0 &&
      typeof gamesPlayed === 'number' && gamesPlayed >= 0
    ) {
      return { gold, silver, bronze, losses, gamesPlayed };
    }
    return null;
  } catch {
    return null;
  }
}

interface SettingRow {
  key: keyof GameSettings;
  label: string;
  description: string;
  iconOn: React.ReactNode;
  iconOff: React.ReactNode;
}

const SETTING_ROWS: SettingRow[] = [
  {
    key: 'soundEnabled',
    label: 'Sound Effects',
    description: 'Play sounds on card actions',
    iconOn: <Volume2 className="w-5 h-5 text-yellow-300" />,
    iconOff: <VolumeX className="w-5 h-5 text-green-500" />,
  },
  {
    key: 'musicEnabled',
    label: 'Music',
    description: 'Background music during gameplay',
    iconOn: <Music className="w-5 h-5 text-yellow-300" />,
    iconOff: <Music2 className="w-5 h-5 text-green-500" />,
  },
  {
    key: 'fullscreenMode',
    label: 'Fullscreen',
    description: 'Expand to full screen',
    iconOn: <Maximize className="w-5 h-5 text-yellow-300" />,
    iconOff: <Minimize className="w-5 h-5 text-green-500" />,
  },
  {
    key: 'particleEffects',
    label: 'Particle Effects',
    description: 'Animations for slams, wipeouts & sparkles',
    iconOn: <Sparkles className="w-5 h-5 text-yellow-300" />,
    iconOff: <Sparkles className="w-5 h-5 text-green-500" />,
  },
  {
    key: 'debugMode',
    label: 'Debug Mode',
    description: 'Show game-state info overlay in-game',
    iconOn: <Bug className="w-5 h-5 text-yellow-300" />,
    iconOff: <Bug className="w-5 h-5 text-green-500" />,
  },
  {
    key: 'beginnerMode',
    label: 'Beginner Mode',
    description: 'Color-codes special cards: 2 (blue), 7 (orange), 10 (red)',
    iconOn: <GraduationCap className="w-5 h-5 text-yellow-300" />,
    iconOff: <GraduationCap className="w-5 h-5 text-green-500" />,
  },
  {
    key: 'turnHighlight',
    label: 'Turn Flash',
    description: 'Briefly flashes the board yellow when it becomes your turn',
    iconOn: <Lightbulb className="w-5 h-5 text-yellow-300" />,
    iconOff: <Lightbulb className="w-5 h-5 text-green-500" />,
  },
];

const GROUPS: { title: string; keys: Array<keyof GameSettings> }[] = [
  { title: 'Audio', keys: ['soundEnabled', 'musicEnabled'] },
  { title: 'Display', keys: ['fullscreenMode', 'particleEffects'] },
  { title: 'Gameplay', keys: ['beginnerMode', 'turnHighlight'] },
  { title: 'Developer', keys: ['debugMode'] },
];

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { settings, toggleSetting } = useSettings();
  const fullscreenAvailable = !!document.fullscreenEnabled;

  const [exportString, setExportString] = useState<string | null>(null);
  const [exportError, setExportError] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importFeedback, setImportFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function handleExport() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      const stats: PlayerStats = raw
        ? (JSON.parse(raw) as PlayerStats)
        : { gold: 0, silver: 0, bronze: 0, losses: 0, gamesPlayed: 0 };
      const encoded = encodeStats(stats);
      if (!encoded) { setExportError(true); return; }
      setExportError(false);
      setExportString(encoded);
    } catch {
      setExportError(true);
    }
  }

  function handleCopy(str: string) {
    navigator.clipboard.writeText(str).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setCopied(false);
      setExportError(true);
    });
  }

  function handleImport() {
    const stats = decodeStats(importInput);
    if (!stats) {
      setImportFeedback({ ok: false, msg: 'Invalid data. Please paste a valid export string.' });
      return;
    }
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
      setImportFeedback({ ok: true, msg: 'Rankings imported successfully!' });
      setImportInput('');
    } catch {
      setImportFeedback({ ok: false, msg: 'Failed to save. Please try again.' });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm max-h-[85vh] bg-gradient-to-b from-green-900 to-green-800 rounded-2xl border border-white/20 shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 shrink-0 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
              <Settings className="w-4 h-4 text-yellow-900" />
            </div>
            <span className="font-bold text-white text-base">Settings</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Settings groups */}
          {GROUPS.map(group => {
            const rows = SETTING_ROWS.filter(r => group.keys.includes(r.key) && (r.key !== 'fullscreenMode' || fullscreenAvailable));
            if (rows.length === 0) return null;
            return (
              <div key={group.title}>
                <h2 className="text-xs uppercase tracking-widest text-green-400 mb-2 pl-1">
                  {group.title}
                </h2>
                <div className="flex flex-col gap-2">
                  {rows.map(row => {
                    const isOn = settings[row.key];
                    return (
                      <button
                        key={row.key}
                        onClick={() => toggleSetting(row.key)}
                        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all active:scale-[0.98] ${
                          isOn
                            ? 'bg-white/15 border border-yellow-400/30'
                            : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isOn ? row.iconOn : row.iconOff}
                          <div className="text-left">
                            <div className={`font-semibold text-sm ${isOn ? 'text-white' : 'text-green-300'}`}>
                              {row.label}
                            </div>
                            <div className="text-xs text-green-400">{row.description}</div>
                          </div>
                        </div>
                        {/* Toggle pill */}
                        <div
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            isOn ? 'bg-yellow-500' : 'bg-green-700'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              isOn ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Rankings export / import */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-green-400 mb-2 pl-1">Rankings</h2>
            <div className="flex flex-col gap-2">
              {/* Export */}
              <button
                onClick={handleExport}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                <Download className="w-5 h-5 text-yellow-400" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-sm text-yellow-300">Export Rankings</div>
                  <div className="text-xs text-green-400">Generate a string to back up your data</div>
                </div>
              </button>
              {exportString !== null && (
                <div className="flex flex-col gap-2 px-1">
                  <textarea
                    readOnly
                    value={exportString}
                    rows={3}
                    className="w-full bg-black/30 border border-white/20 rounded-lg p-2 text-xs text-green-200 font-mono resize-none focus:outline-none"
                    onClick={e => (e.target as HTMLTextAreaElement).select()}
                  />
                  {exportError && (
                    <p className="text-xs px-1 text-red-400">Could not copy to clipboard. Please select and copy the text above manually.</p>
                  )}
                  <button
                    onClick={() => handleCopy(exportString)}
                    className="self-end text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 hover:bg-yellow-500/30 active:scale-[0.98] transition-all"
                  >
                    {copied ? '✓ Copied!' : 'Copy to clipboard'}
                  </button>
                </div>
              )}
              {exportError && exportString === null && (
                <p className="text-xs px-1 text-red-400">Export failed. Please try again.</p>
              )}

              {/* Import */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                  <Upload className="w-5 h-5 text-green-400 shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-semibold text-sm text-green-300">Import Rankings</div>
                    <div className="text-xs text-green-400">Paste an export string to restore data</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 px-1">
                  <textarea
                    value={importInput}
                    onChange={e => { setImportInput(e.target.value); setImportFeedback(null); }}
                    rows={3}
                    placeholder="Paste export string here…"
                    className="w-full bg-black/30 border border-white/20 rounded-lg p-2 text-xs text-green-200 font-mono resize-none focus:outline-none placeholder:text-green-700"
                  />
                  {importFeedback && (
                    <p className={`text-xs px-1 ${importFeedback.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {importFeedback.msg}
                    </p>
                  )}
                  <button
                    onClick={handleImport}
                    disabled={!importInput.trim()}
                    className="self-end text-xs px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-400/30 text-green-300 hover:bg-green-500/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Version History & Tutorial links */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-green-400 mb-2 pl-1">About</h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { onClose(); navigate('/version-log'); }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                <History className="w-5 h-5 text-green-400" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-sm text-green-300">Version History</div>
                  <div className="text-xs text-green-400">See all past releases</div>
                </div>
                <span className="text-green-500 text-sm">→</span>
              </button>
              <button
                onClick={() => {
                  try { localStorage.removeItem(TUTORIAL_SEEN_KEY); } catch { /* ignore */ }
                  onClose();
                  navigate('/');
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                <GraduationCap className="w-5 h-5 text-yellow-400" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-sm text-yellow-300">Tutorial</div>
                  <div className="text-xs text-green-400">Replay the guided tutorial</div>
                </div>
                <span className="text-green-500 text-sm">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
