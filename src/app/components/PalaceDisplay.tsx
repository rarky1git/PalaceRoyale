import { PalaceSlot, Card } from '../game-engine';
import { PlayingCard } from './PlayingCard';

interface PalaceDisplayProps {
  palace: PalaceSlot[];
  isCurrentPlayer?: boolean;
  canPlayFaceUp?: boolean;
  canPlayFaceDown?: boolean;
  selectedCards?: string[];
  onCardClick?: (card: Card) => void;
  onFaceDownClick?: (slotIndex: number) => void;
  small?: boolean;
  mini?: boolean;
  playerName?: string;
  statsText?: string; // Short stats string shown next to player name (e.g. "🥇2 🥈1")
  centered?: boolean;
  showRotation?: boolean;
  playableCardIds?: string[];
  isGameOver?: boolean;
}

// Deterministic rotation seeded by card identity (produces different angles per card)
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return ((hash & 0x7fffffff) % 1000) / 1000;
}

function getCardRotation(cardId: string, range: number = 6): number {
  const r = seededRandom(cardId);
  return (r * range * 2) - range; // -range to +range degrees
}

export function PalaceDisplay({
  palace,
  isCurrentPlayer,
  canPlayFaceUp,
  canPlayFaceDown,
  selectedCards = [],
  onCardClick,
  onFaceDownClick,
  small,
  mini,
  playerName,
  statsText,
  centered,
  showRotation,
  playableCardIds,
  isGameOver,
}: PalaceDisplayProps) {
  // True when every slot has lost its face-up card
  const allFaceUpGone = palace.every(slot => !slot.faceUp);

  return (
    <div
      className={`flex flex-col gap-3.5 rounded-lg ${centered ? 'items-center' : 'items-start'}`}
    >
      {playerName && (
        <div className="flex items-center gap-1">
          <span className={`${small || mini ? 'text-[10px]' : 'text-xs'} font-bold text-gray-200 truncate max-w-32`}>
            {playerName}
          </span>
          {statsText && (
            <span className={`${small || mini ? 'text-[10px]' : 'text-xs'} text-yellow-300 shrink-0`}>
              {statsText}
            </span>
          )}
        </div>
      )}
      <div className={`flex ${mini ? 'gap-3' : 'gap-3'}`}>
        {palace.map((slot, i) => {
          const faceUpRot = showRotation && slot.faceUp ? getCardRotation(slot.faceUp.id) : 0;
          const faceDownRot = showRotation && slot.faceDown ? getCardRotation('fd-' + i) : 0;
          const isFaceUpPlayable = !slot.faceUp || !playableCardIds || playableCardIds.includes(slot.faceUp.id);
          // At end of game, show face-down cards on top so they can be revealed
          // even when a face-up card is still present in the same slot.
          const faceDownOnTop = !!isGameOver && !!slot.faceDown && !!slot.faceUp;
          return (
            <div key={i} className="flex flex-col-reverse items-center">
              {/* Face up card — hidden (no placeholder) once all face-ups are gone */}
              {!allFaceUpGone && (
                <div className={`flex gap-2 ${faceDownOnTop ? '' : 'z-10'}`} style={showRotation && slot.faceUp ? { transform: `rotate(${faceUpRot}deg)` } : undefined}>
                  {slot.faceUp ? (
                    <PlayingCard
                      card={slot.faceUp}
                      small={small}
                      mini={mini}
                      selected={selectedCards.includes(slot.faceUp.id)}
                      onClick={isCurrentPlayer && canPlayFaceUp && isFaceUpPlayable ? () => onCardClick?.(slot.faceUp!) : undefined}
                      highlight={isCurrentPlayer && canPlayFaceUp && isFaceUpPlayable}
                      disabled={canPlayFaceUp && !isFaceUpPlayable}
                    />
                  ) : (
                    <div className={`${mini ? 'w-8 h-11' : small ? 'w-14 h-20' : 'w-12 h-18'} ${mini ? 'rounded' : 'rounded-lg'} border border-dashed border-gray-200/20`} />
                  )}
                </div>
              )}
              {/* Face down card — when all face-ups gone or game over, sits on top with no negative offset */}
              <div
                className={`flex gap-2 -mr-[.5em] ${allFaceUpGone || faceDownOnTop ? '' : mini ? '-mb-[3em]' : '-mb-[5em]'} ${faceDownOnTop ? 'z-10' : ''}`}
                style={showRotation && slot.faceDown ? { transform: `rotate(${faceDownRot}deg)` } : undefined}
              >
                {slot.faceDown ? (
                  <PlayingCard
                    faceDown
                    small={small}
                    mini={mini}
                    onClick={isCurrentPlayer && canPlayFaceDown && !slot.faceUp ? () => onFaceDownClick?.(i) : undefined}
                    highlight={isCurrentPlayer && canPlayFaceDown && !slot.faceUp}
                  />
                ) : (
                  <div className={`${mini ? 'w-8 h-11' : small ? 'w-14 h-20' : 'w-12 h-18'} ${mini ? 'rounded' : 'rounded-lg'} border border-dashed border-gray-200`} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
