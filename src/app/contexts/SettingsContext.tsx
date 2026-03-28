import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  fullscreenMode: boolean;
  particleEffects: boolean;
  vsyncEnabled: boolean;
  debugMode: boolean;
  beginnerMode: boolean;
}

const SETTINGS_KEY = 'palace-settings';

const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  fullscreenMode: false,
  particleEffects: true,
  vsyncEnabled: true,
  debugMode: false,
  beginnerMode: false,
};

interface SettingsContextValue {
  settings: GameSettings;
  toggleSetting: (key: keyof GameSettings) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultSettings,
  toggleSetting: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
    } catch { /* ignore */ }
    return defaultSettings;
  });

  // Persist to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch { /* ignore */ }
  }, [settings]);

  // Sync fullscreen state with the browser Fullscreen API
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      setSettings(prev => {
        if (prev.fullscreenMode !== isFullscreen) {
          return { ...prev, fullscreenMode: isFullscreen };
        }
        return prev;
      });
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleSetting = useCallback((key: keyof GameSettings) => {
    if (key === 'fullscreenMode') {
      setSettings(prev => {
        const next = { ...prev, fullscreenMode: !prev.fullscreenMode };
        if (next.fullscreenMode) {
          document.documentElement.requestFullscreen().catch(() => {
            // Fullscreen request failed; revert the toggle
            setSettings(s => ({ ...s, fullscreenMode: false }));
          });
        } else {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
        return next;
      });
    } else {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, toggleSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
