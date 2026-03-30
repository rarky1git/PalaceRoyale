import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { GameState, initGame } from '../game-engine';
import { GameBoard } from '../components/GameBoard';
import { HowToPlayModal } from '../components/HowToPlayModal';
import { HelpCircle } from 'lucide-react';

export default function RobotGamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { playerNames?: string[]; playerEmojis?: string[]; dealerIndex?: number; deckCount?: number; tutorial?: boolean } | null;
  const tutorial = state?.tutorial ?? false;

  const playerNames = state?.playerNames ?? ['You', 'Bot 1'];
  const playerEmojis = state?.playerEmojis ?? ['🦆', '⚔️'];
  const dealerIndex = state?.dealerIndex ?? 0;
  const deckCount = state?.deckCount ?? 1;

  const [gameState, setGameState] = useState<GameState>(() => initGame(playerNames, dealerIndex, deckCount, playerEmojis));
  const [showHelp, setShowHelp] = useState(false);

  const handleRestart = () => {
    setGameState(initGame(playerNames, dealerIndex, deckCount ?? 1, playerEmojis));
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-green-950 text-white shrink-0">
        <button onClick={() => navigate('/')} className="text-sm text-green-300 hover:text-white">← Home</button>
        <span className="text-sm font-bold">Robot Mode</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)} className="text-green-300 hover:text-white">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button onClick={handleRestart} className="text-sm text-yellow-400 hover:text-yellow-300">Restart</button>
        </div>
      </div>
      {showHelp && <HowToPlayModal onClose={() => setShowHelp(false)} />}
      <div className="flex-1 min-h-0 overflow-visible">
        <GameBoard
          gameState={gameState}
          myPlayerId="player-0"
          onStateChange={setGameState}
          playerEmoji={playerEmojis?.[0]}
          tutorialMode={tutorial}
        />
      </div>
    </div>
  );
}
