import { createBrowserRouter } from 'react-router';
import HomePage from './pages/HomePage';
import RobotGamePage from './pages/RobotGamePage';
import LobbyPage from './pages/LobbyPage';
import MultiplayerGamePage from './pages/MultiplayerGamePage';
import HowToPlayPage from './pages/HowToPlayPage';
import SettingsPage from './pages/SettingsPage';
import RejoinGamesPage from './pages/RejoinGamesPage';
import WhatsNewPage from './pages/WhatsNewPage';
import VersionLogPage from './pages/VersionLogPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';

export const router = createBrowserRouter([
  { path: '/', Component: HomePage },
  { path: '/robot', Component: RobotGamePage },
  { path: '/lobby', Component: LobbyPage },
  { path: '/multiplayer', Component: MultiplayerGamePage },
  { path: '/how-to-play', Component: HowToPlayPage },
  { path: '/settings', Component: SettingsPage },
  { path: '/rejoin-games', Component: RejoinGamesPage },
  { path: '/whats-new', Component: WhatsNewPage },
  { path: '/version-log', Component: VersionLogPage },
  { path: '/auth', Component: AuthPage },
  { path: '/profile', Component: ProfilePage },
]);