import { Card, getRankDisplay, getSuitSymbol, getSuitColor } from '../game-engine';
import { useSettings } from '../contexts/SettingsContext';

interface PlayingCardProps {
  card?: Card | null;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  small?: boolean;
  mini?: boolean;
  xsmall?: boolean;
  disabled?: boolean;
  highlight?: boolean;
}

export function PlayingCard({ card, faceDown, selected, onClick, small, mini, xsmall, disabled, highlight }: PlayingCardProps) {
  const { settings } = useSettings();
  const w = mini ? 'w-8 h-11' : xsmall ? 'w-9 h-[52px]' : small ? 'w-14 h-20' : 'w-10 h-[60px]';
  const textSize = mini ? 'text-[8px]' : xsmall ? 'text-[10px]' : small ? 'text-xs' : 'text-[11px]';

  if (!card || faceDown) {
    return (
      <button
        onClick={onClick}
        disabled={disabled && !onClick}
        className={`${w} ${mini ? 'rounded border' : 'rounded-lg border-2'} flex items-center justify-center cursor-pointer
          ${highlight ? 'border-yellow-400 bg-gradient-to-br from-blue-700 to-blue-900 shadow-lg shadow-yellow-400/30 animate-pulse' : 'border-gray-400 bg-gradient-to-br from-blue-600 to-blue-800'}
          ${selected ? `${mini ? 'ring-1' : 'ring-2'} ring-yellow-400 -translate-y-2` : ''}
          ${onClick && !disabled ? 'hover:brightness-110 active:scale-95' : ''}
          transition-all shrink-0`}
      >
        <span className={`text-white ${mini ? 'text-xs' : xsmall ? 'text-base' : 'text-lg'} font-bold`}>♠</span>
      </button>
    );
  }

  const color = getSuitColor(card.suit);
  const isRed = color === 'red';

  const beginnerBg = settings.beginnerMode
    ? card.rank === 2 ? 'bg-blue-200'
    : card.rank === 10 ? 'bg-red-200'
    : card.rank === 7 ? 'bg-orange-200'
    : 'bg-white'
    : 'bg-white';

  if (mini) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${w} rounded border ${beginnerBg} flex items-center justify-center cursor-pointer
          ${selected ? 'border-yellow-400 ring-1 ring-yellow-400' : 'border-gray-300'}
          ${disabled ? 'opacity-50' : ''}
          transition-all shrink-0`}
      >
        <span className="flex flex-col items-center">
          <span className={`text-[10px] font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
            {getRankDisplay(card.rank)}
          </span>
          <span className={`text-[9px] leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
            {getSuitSymbol(card.suit)}
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${w} rounded-lg border-2 ${beginnerBg} flex flex-col items-start justify-between p-0.5 cursor-pointer
        ${selected ? 'border-yellow-400 ring-2 ring-yellow-400 -translate-y-2 shadow-lg' : 'border-gray-300'}
        ${highlight ? 'border-green-400 ring-2 ring-green-400 shadow-lg shadow-green-400/30' : ''}
        ${onClick && !disabled ? 'hover:shadow-md active:scale-95' : ''}
        ${disabled ? 'opacity-60' : ''}
        transition-all shrink-0`}
    >
      <div className={`${textSize} font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {getRankDisplay(card.rank)}
      </div>
      <div className={`self-center ${small ? 'text-base' : xsmall ? 'text-lg' : 'text-xl'} ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {getSuitSymbol(card.suit)}
      </div>
      <div className={`${textSize} font-bold leading-none self-end rotate-180 ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {getRankDisplay(card.rank)}
      </div>
    </button>
  );
}

export function CardStack({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-22">
        {count > 2 && (
          <div className="absolute top-0 left-1 w-14 h-20 rounded-lg border-2 border-gray-400 bg-gradient-to-br from-blue-600 to-blue-800" />
        )}
        {count > 1 && (
          <div className="absolute top-0.5 left-0.5 w-14 h-20 rounded-lg border-2 border-gray-400 bg-gradient-to-br from-blue-600 to-blue-800" />
        )}
        {count > 0 && (
          <div className="absolute top-1 left-0 w-14 h-20 rounded-lg border-2 border-gray-400 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
            <span className="text-white font-bold text-sm">{count}</span>
          </div>
        )}
        {count === 0 && (
          <div className="w-14 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <span className="text-gray-400 text-xs">Empty</span>
          </div>
        )}
      </div>
      <span className="text-[10px] text-gray-500 font-medium">{label}</span>
    </div>
  );
}