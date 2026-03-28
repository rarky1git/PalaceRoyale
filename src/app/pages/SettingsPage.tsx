import { useNavigate } from 'react-router';
import { Settings, Volume2, VolumeX, Music, Music2, Maximize, Minimize, Sparkles, Bug, GraduationCap } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import type { GameSettings } from '../contexts/SettingsContext';

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
    description: 'Color-codes special cards (2, 7, 10) and flashes the board on your turn',
    iconOn: <GraduationCap className="w-5 h-5 text-yellow-300" />,
    iconOff: <GraduationCap className="w-5 h-5 text-green-500" />,
  },
];

const GROUPS: { title: string; keys: Array<keyof GameSettings> }[] = [
  { title: 'Audio', keys: ['soundEnabled', 'musicEnabled'] },
  { title: 'Display', keys: ['fullscreenMode', 'particleEffects'] },
  { title: 'Gameplay', keys: ['beginnerMode'] },
  { title: 'Developer', keys: ['debugMode'] },
];

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, toggleSetting } = useSettings();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col items-center justify-start p-6 text-white">
      {/* Header */}
      <div className="w-full max-w-xs flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-green-300 hover:text-white text-sm"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
            <Settings className="w-5 h-5 text-yellow-900" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>
        <div className="w-10" />
      </div>

      {/* Settings groups */}
      <div className="flex flex-col gap-5 w-full max-w-xs">
        {GROUPS.map(group => {
          const rows = SETTING_ROWS.filter(r => group.keys.includes(r.key));
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
      </div>
    </div>
  );
};

export default SettingsPage;
