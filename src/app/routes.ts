import { createBrowserRouter } from 'react-router';
import HomePage from './pages/HomePage';
import RobotGamePage from './pages/RobotGamePage';
import LobbyPage from './pages/LobbyPage';
import MultiplayerGamePage from './pages/MultiplayerGamePage';
import HowToPlayPage from './pages/HowToPlayPage';

export const router = createBrowserRouter([
  { path: '/', Component: HomePage },
  { path: '/robot', Component: RobotGamePage },
  { path: '/lobby', Component: LobbyPage },
  { path: '/multiplayer', Component: MultiplayerGamePage },
  { path: '/how-to-play', Component: HowToPlayPage },
]);