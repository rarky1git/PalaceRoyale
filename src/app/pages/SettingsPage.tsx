import React, { useState } from 'react';

interface GameSettings {
    soundEnabled: boolean;
    musicEnabled: boolean;
    fullscreenMode: boolean;
    particleEffects: boolean;
    vsyncEnabled: boolean;
    debugMode: boolean;
}

export const SettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<GameSettings>({
        soundEnabled: true,
        musicEnabled: true,
        fullscreenMode: false,
        particleEffects: true,
        vsyncEnabled: true,
        debugMode: false,
    });

    const handleToggle = (key: keyof GameSettings) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
        // TODO: Send to game engine
        console.log(`${key} toggled to:`, !settings[key]);
    };

    return (
        <div className="settings-page">
            <h1>Game Settings</h1>
            
            <div className="settings-group">
                <h2>Audio</h2>
                <label>
                    <input
                        type="checkbox"
                        checked={settings.soundEnabled}
                        onChange={() => handleToggle('soundEnabled')}
                    />
                    Sound Effects
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={settings.musicEnabled}
                        onChange={() => handleToggle('musicEnabled')}
                    />
                    Music
                </label>
            </div>

            <div className="settings-group">
                <h2>Graphics</h2>
                <label>
                    <input
                        type="checkbox"
                        checked={settings.fullscreenMode}
                        onChange={() => handleToggle('fullscreenMode')}
                    />
                    Fullscreen Mode
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={settings.particleEffects}
                        onChange={() => handleToggle('particleEffects')}
                    />
                    Particle Effects
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={settings.vsyncEnabled}
                        onChange={() => handleToggle('vsyncEnabled')}
                    />
                    VSync
                </label>
            </div>

            <div className="settings-group">
                <h2>Developer</h2>
                <label>
                    <input
                        type="checkbox"
                        checked={settings.debugMode}
                        onChange={() => handleToggle('debugMode')}
                    />
                    Debug Mode
                </label>
            </div>
        </div>
    );
};

export default SettingsPage;