import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  emoji: string;
  content: React.ReactNode;
}

function RuleCard({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
      <div className="flex items-center gap-2 font-bold text-sm text-white">
        <span>{emoji}</span>
        <span>{title}</span>
      </div>
      <div className="text-xs text-green-200 leading-relaxed">{children}</div>
    </div>
  );
}

function Pill({ children, color = 'yellow' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    red: 'bg-red-500/20 text-red-300 border-red-500/40',
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    green: 'bg-green-500/20 text-green-300 border-green-500/40',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${colors[color] || colors.yellow}`}>
      {children}
    </span>
  );
}

const rankRules: Record<number, { label: string; description: string; color?: string }> = {
  2:  { label: '2', description: 'Wild reset — can be played on any card. The pile continues normally from 2 (low value). Next player can play anything.', color: 'bg-blue-200' },
  7:  { label: '7', description: 'Reverse mirror — next player must play a card equal to or lower than 7 (not higher).', color: 'bg-orange-200' },
  10: { label: '10', description: 'Wipeout — clears the entire discard pile. Grants a bonus turn. Can be played on any card.', color: 'bg-red-200' },
  3:  { label: '3',  description: 'Standard card. Must be played on equal or higher rank.' },
  4:  { label: '4',  description: 'Standard card. Must be played on equal or higher rank.' },
  5:  { label: '5',  description: 'Standard card. Must be played on equal or higher rank.' },
  6:  { label: '6',  description: 'Standard card. Must be played on equal or higher rank.' },
  8:  { label: '8',  description: 'Standard card. Must be played on equal or higher rank.' },
  9:  { label: '9',  description: 'Standard card. Must be played on equal or higher rank.' },
  11: { label: 'J',  description: 'Jack. Must be played on equal or higher rank.' },
  12: { label: 'Q',  description: 'Queen. Must be played on equal or higher rank.' },
  13: { label: 'K',  description: 'King. Must be played on equal or higher rank.' },
  14: { label: 'A',  description: 'Ace — the highest standard card. Very difficult to beat.' },
};

const RANK_ORDER = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 2];

function InteractiveCardHierarchy() {
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      <p className="text-xs">Click a rank to see its rules:</p>
      <div className="flex flex-wrap gap-1 justify-center py-1">
        {RANK_ORDER.map(rank => {
          const rule = rankRules[rank];
          return (
            <button
              key={rank}
              onClick={() => setSelectedRank(selectedRank === rank ? null : rank)}
              className={`px-2 py-1 rounded text-xs font-bold border-2 transition-colors
                ${selectedRank === rank ? 'border-white' : 'border-transparent'}
                ${rule.color ?? 'bg-gray-200'}
              `}
            >
              {rule.label}
            </button>
          );
        })}
      </div>
      <div className="text-center text-[10px] text-green-400">← lowest &nbsp;&nbsp;&nbsp; highest →</div>
      {selectedRank !== null && rankRules[selectedRank] && (
        <div className="mt-1 p-2 bg-white/10 rounded text-xs">
          <span className="font-bold">{rankRules[selectedRank].label}:</span>{' '}
          {rankRules[selectedRank].description}
        </div>
      )}
    </div>
  );
}

const sections: Section[] = [
  {
    id: 'goal', title: 'Objective', emoji: '🏆',
    content: <p>Be the first to get rid of <strong className="text-white">all your cards</strong>. The last player holding cards <strong className="text-white">LOSES</strong> and is the Palace Player!</p>,
  },
  {
    id: 'setup', title: 'Palace Setup', emoji: '🏰',
    content: (
      <div className="space-y-2">
        <p>Each player gets <strong className="text-white">9 cards</strong>:</p>
        <ol className="space-y-1 list-none text-xs">
          <li>1. Choose 3 cards <strong className="text-white">face-down</strong> (blind)</li>
          <li>2. Choose 3 cards <strong className="text-white">face-up</strong> on top</li>
          <li>3. Remaining 3 become your hand</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'gameplay', title: 'How to Play', emoji: '🃏',
    content: (
      <div className="space-y-2">
        <p>Play cards <strong className="text-white">equal or higher</strong> than the top of the pile. Play multiples of the same rank at once. Draw back up to 3 cards.</p>
        <p>Can't play? <strong className="text-white">Pick up the pile!</strong></p>
      </div>
    ),
  },
  {
    id: 'special', title: 'Special Cards', emoji: '✨',
    content: (
      <div className="space-y-2">
        <InteractiveCardHierarchy />
        <RuleCard emoji="2" title="2 - Bonus Action">Plays on anything. Get a bonus turn. Can't end game with a 2.</RuleCard>
        <RuleCard emoji="7" title="7 - Reversal">Next player must play 7 or lower.</RuleCard>
        <RuleCard emoji="10" title="10 - Wipeout">Clears the pile. Get a bonus turn.</RuleCard>
        <RuleCard emoji="4x" title="Four of a Kind">Wipes pile. Others can <Pill color="purple">Steal!</Pill> to complete it.</RuleCard>
      </div>
    ),
  },
  {
    id: 'palace', title: 'Playing the Palace', emoji: '🏯',
    content: (
      <div className="space-y-2">
        <p>Once hand + draw pile empty: play <strong className="text-white">face-up</strong> palace cards, then <strong className="text-white">face-down</strong> (blind).</p>
        <p>If a blind card fails, pick up the entire pile!</p>
      </div>
    ),
  },
  {
    id: 'winning', title: 'Winning & Losing', emoji: '🥇',
    content: (
      <div className="space-y-2">
        <p>Players who empty all cards are <strong className="text-white">safe</strong>. Game continues until one player remains.</p>
        <p>The <strong className="text-red-400">last player with cards LOSES!</strong></p>
      </div>
    ),
  },
];

function AccordionItem({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 text-left"
      >
        <div className="flex items-center gap-2">
          <span>{section.emoji}</span>
          <span className="font-bold text-xs text-white">{section.title}</span>
        </div>
        {open ? <ChevronUp className="w-3 h-3 text-green-400" /> : <ChevronDown className="w-3 h-3 text-green-400" />}
      </button>
      {open && (
        <div className="p-3 pt-1 bg-black/20 text-xs text-green-200 leading-relaxed">
          {section.content}
        </div>
      )}
    </div>
  );
}

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm max-h-[80vh] bg-gradient-to-b from-green-900 to-green-800 rounded-2xl border border-white/20 shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-2 shrink-0">
          <span className="font-bold text-white text-sm">How to Play Palace</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-2">
          {sections.map(s => <AccordionItem key={s.id} section={s} />)}
        </div>
      </div>
    </div>
  );
}
