import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsProvider, useSettings } from '../app/contexts/SettingsContext'

const SETTINGS_KEY = 'palace-settings'

// Simple consumer component for testing
function SettingsDisplay() {
  const { settings, toggleSetting } = useSettings()
  return (
    <div>
      <span data-testid="sound">{String(settings.soundEnabled)}</span>
      <span data-testid="music">{String(settings.musicEnabled)}</span>
      <span data-testid="particles">{String(settings.particleEffects)}</span>
      <span data-testid="debug">{String(settings.debugMode)}</span>
      <button onClick={() => toggleSetting('soundEnabled')}>toggle-sound</button>
      <button onClick={() => toggleSetting('musicEnabled')}>toggle-music</button>
      <button onClick={() => toggleSetting('debugMode')}>toggle-debug</button>
      <button onClick={() => toggleSetting('particleEffects')}>toggle-particles</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  // jsdom does not implement the Fullscreen API — stub it out
  if (!document.documentElement.requestFullscreen) {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
      configurable: true,
    })
  } else {
    vi.spyOn(document.documentElement, 'requestFullscreen').mockResolvedValue(undefined)
  }
  if (!document.exitFullscreen) {
    Object.defineProperty(document, 'exitFullscreen', {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
      configurable: true,
    })
  } else {
    vi.spyOn(document, 'exitFullscreen').mockResolvedValue(undefined)
  }
})

describe('SettingsProvider - defaults', () => {
  it('renders default settings when localStorage is empty', () => {
    render(<SettingsProvider><SettingsDisplay /></SettingsProvider>)
    expect(screen.getByTestId('sound').textContent).toBe('true')
    expect(screen.getByTestId('music').textContent).toBe('true')
    expect(screen.getByTestId('particles').textContent).toBe('true')
    expect(screen.getByTestId('debug').textContent).toBe('false')
  })
})

describe('SettingsProvider - toggleSetting', () => {
  it('toggles soundEnabled from true to false', async () => {
    const user = userEvent.setup()
    render(<SettingsProvider><SettingsDisplay /></SettingsProvider>)
    await user.click(screen.getByText('toggle-sound'))
    expect(screen.getByTestId('sound').textContent).toBe('false')
  })

  it('toggles soundEnabled back to true on second click', async () => {
    const user = userEvent.setup()
    render(<SettingsProvider><SettingsDisplay /></SettingsProvider>)
    await user.click(screen.getByText('toggle-sound'))
    await user.click(screen.getByText('toggle-sound'))
    expect(screen.getByTestId('sound').textContent).toBe('true')
  })

  it('toggles debugMode from false to true', async () => {
    const user = userEvent.setup()
    render(<SettingsProvider><SettingsDisplay /></SettingsProvider>)
    await user.click(screen.getByText('toggle-debug'))
    expect(screen.getByTestId('debug').textContent).toBe('true')
  })

  it('each setting toggles independently', async () => {
    const user = userEvent.setup()
    render(<SettingsProvider><SettingsDisplay /></SettingsProvider>)
    await user.click(screen.getByText('toggle-sound'))
    // music should be unchanged
    expect(screen.getByTestId('music').textContent).toBe('true')
    expect(screen.getByTestId('sound').textContent).toBe('false')
  })
})

describe('SettingsProvider - localStorage persistence', () => {
  it('persists changed setting to localStorage', async () => {
    const user = userEvent.setup()
    render(<SettingsProvider><SettingsDisplay /></SettingsProvider>)
    await user.click(screen.getByText('toggle-sound'))
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)!)
    expect(stored.soundEnabled).toBe(false)
  })

  it('reads persisted settings from localStorage on mount', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ soundEnabled: false, debugMode: true }))
    render(<SettingsProvider><SettingsDisplay /></SettingsProvider>)
    expect(screen.getByTestId('sound').textContent).toBe('false')
    expect(screen.getByTestId('debug').textContent).toBe('true')
    // Un-set keys fall back to defaults
    expect(screen.getByTestId('music').textContent).toBe('true')
  })

  it('falls back to defaults when localStorage contains invalid JSON', () => {
    localStorage.setItem(SETTINGS_KEY, 'not-valid-json')
    render(<SettingsProvider><SettingsDisplay /></SettingsProvider>)
    expect(screen.getByTestId('sound').textContent).toBe('true')
  })
})

describe('SettingsProvider - fullscreen sync', () => {
  it('updates fullscreenMode when fullscreenchange fires with active element', async () => {
    // Mock document.fullscreenElement to simulate entering fullscreen
    Object.defineProperty(document, 'fullscreenElement', {
      get: vi.fn().mockReturnValue(document.body),
      configurable: true,
    })

    function FullscreenDisplay() {
      const { settings } = useSettings()
      return <span data-testid="fs">{String(settings.fullscreenMode)}</span>
    }

    render(<SettingsProvider><FullscreenDisplay /></SettingsProvider>)

    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })

    expect(screen.getByTestId('fs').textContent).toBe('true')

    // Reset
    Object.defineProperty(document, 'fullscreenElement', {
      get: vi.fn().mockReturnValue(null),
      configurable: true,
    })
  })
})
