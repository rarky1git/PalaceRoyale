import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Crown, ArrowLeft, Sparkles } from 'lucide-react';

const APP_VERSION = '0.6.0';
export const WHATS_NEW_SEEN_KEY = 'palace-whats-new-seen';
export { APP_VERSION };

function FeatureSection({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 font-bold text-sm text-white">
        <span className="text-lg">{emoji}</span>
        <span>{title}</span>
      </div>
      <div className="space-y-2 text-xs text-green-200 leading-relaxed">{children}</div>
    </div>
  );
}

function Chip({ children, color = 'green' }: { children: React.ReactNode; color?: 'green' | 'yellow' | 'blue' | 'purple' | 'orange' | 'red' }) {
  const colors = {
    green:  'bg-green-500/20 text-green-300 border-green-500/40',
    yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    blue:   'bg-blue-500/20 text-blue-300 border-blue-500/40',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    red:    'bg-red-500/20 text-red-300 border-red-500/40',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[color]}`}>
      {children}
    </span>
  );
}

/** Tiny playing-card mockup used for visual screenshots */
function MiniCard({ rank, bg = 'bg-white' }: { rank: string; bg?: string }) {
  return (
    <div className={`w-9 h-12 rounded-md border-2 border-gray-300 ${bg} flex flex-col items-start justify-between p-0.5 shadow-sm shrink-0`}>
      <span className="text-[9px] font-bold leading-none text-gray-900">{rank}</span>
      <span className="self-center text-xs text-gray-900">♠</span>
      <span className="text-[9px] font-bold leading-none self-end rotate-180 text-gray-900">{rank}</span>
    </div>
  );
}

/** Mockup for a face-down palace card */
function FaceDownCard({ glow = false }: { glow?: boolean }) {
  return (
    <div className={`w-9 h-12 rounded-md border-2 border-blue-400 bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center shadow-sm shrink-0 ${glow ? 'ring-2 ring-green-400 shadow-green-400/50 shadow-md' : ''}`}>
      <span className="text-white text-sm font-bold">♠</span>
    </div>
  );
}

/** Visual mockup for the "palace-valid" animation card */
function PalaceValidMockup() {
  return (
    <div className="relative bg-green-900/30 border border-green-400/40 rounded-lg p-3 flex flex-col items-center gap-2">
      <div className="flex gap-2 items-end">
        <FaceDownCard />
        <FaceDownCard />
        <div className="relative">
          <MiniCard rank="K" />
          {/* Green overlay */}
          <div className="absolute inset-0 rounded-md bg-green-400/50 flex items-center justify-center">
            <span className="text-[8px] font-black text-white">✅</span>
          </div>
        </div>
      </div>
      <span className="text-green-300 text-[10px] font-bold">✅ Safe! Face-down card played!</span>
    </div>
  );
}

/** Bot profile roster mockup */
function BotRosterMockup() {
  const bots = [
    { name: 'Arthur', emoji: '⚔️', color: 'text-yellow-300' },
    { name: 'James',  emoji: '🏹', color: 'text-blue-300' },
    { name: 'Edward', emoji: '🛡️', color: 'text-purple-300' },
    { name: 'Henry',  emoji: '🗡️', color: 'text-red-300' },
    { name: 'Francis',emoji: '🎭', color: 'text-green-300' },
    { name: 'Thomas', emoji: '🦉', color: 'text-orange-300' },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {bots.map(b => (
        <div key={b.name} className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1.5">
          <span className="text-base">{b.emoji}</span>
          <span className={`text-[10px] font-bold ${b.color}`}>{b.name}</span>
        </div>
      ))}
    </div>
  );
}

/** Card hierarchy mockup matching new playing-card style */
function CardHierarchyMockup() {
  const ranks = [
    { r: '3', bg: 'bg-white' }, { r: '7', bg: 'bg-orange-200' },
    { r: '10', bg: 'bg-red-200' }, { r: 'A', bg: 'bg-white' }, { r: '2', bg: 'bg-blue-200' },
  ];
  return (
    <div className="flex gap-1.5 items-end">
      {ranks.map(({ r, bg }) => (
        <MiniCard key={r} rank={r} bg={bg} />
      ))}
      <span className="text-[10px] text-green-400 self-center ml-1">← click any card</span>
    </div>
  );
}

/** Special card color chips mockup */
function SpecialCardsMockup() {
  return (
    <div className="flex gap-2 items-center">
      <MiniCard rank="2" bg="bg-blue-200" />
      <span className="text-[10px] text-blue-300">Reset</span>
      <MiniCard rank="7" bg="bg-orange-200" />
      <span className="text-[10px] text-orange-300">Low only</span>
      <MiniCard rank="10" bg="bg-red-200" />
      <span className="text-[10px] text-red-300">Wipeout</span>
    </div>
  );
}

/** Safe ranking display mockup */
function SafeRankingMockup() {
  return (
    <div className="flex flex-col gap-1">
      {[{ rank: '🥇 Gold!', name: 'Arthur', done: true }, { rank: '🥈 Silver!', name: 'You', me: true, done: true }, { rank: '🥉 Bronze!', name: 'Henry', done: true }].map(p => (
        <div key={p.name} className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] ${p.me ? 'bg-yellow-500/30 font-bold' : 'bg-white/10'}`}>
          <span>{p.rank}</span>
          <span className="text-white">{p.name}</span>
          {p.done && <span className="text-green-400">✅</span>}
        </div>
      ))}
    </div>
  );
}

/** Deck selector mockup */
function DeckSelectorMockup() {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] text-green-400">Card Decks</span>
      <div className="flex gap-2">
        {[1, 2, 3].map(n => (
          <div key={n} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold text-center ${n === 2 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}`}>
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WhatsNewPage() {
  const navigate = useNavigate();

  // Mark as seen when this page is opened
  useEffect(() => {
    try { localStorage.setItem(WHATS_NEW_SEEN_KEY, APP_VERSION); } catch { /* ignore */ }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-green-900/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-lg">What's New in v{APP_VERSION}</span>
        </div>
        <div className="w-8 h-8 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg shrink-0">
          <Crown className="w-4 h-4 text-yellow-900" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-3 pb-16">
        {/* Version banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-yellow-300">
            <span className="text-lg">🚀</span> Palace Royale v{APP_VERSION}
          </div>
          <p className="text-sm text-yellow-100 leading-relaxed">
            This release brings <strong>knight-named AI bots</strong>, a <strong>beginner mode</strong>, interactive How to Play, palace animations, and a stack of quality-of-life improvements.
          </p>
        </div>

        {/* 1. Knight bot profiles */}
        <FeatureSection emoji="⚔️" title="Knight-Named Bot Profiles">
          <p>Meet 8 unique AI opponents, each with their own personality, play style, and reaction speed. From the lightning-fast <strong className="text-white">James</strong> to the brooding <strong className="text-white">Thomas</strong>, every match feels different.</p>
          <BotRosterMockup />
          <div className="flex flex-wrap gap-1 pt-0.5">
            <Chip color="yellow">Variable timing</Chip>
            <Chip color="purple">Counter tendency</Chip>
            <Chip color="red">Risk tolerance</Chip>
          </div>
        </FeatureSection>

        {/* 2. Beginner mode */}
        <FeatureSection emoji="🎓" title="Beginner Mode">
          <p>Enable <strong className="text-white">Beginner Mode</strong> in Settings to color-code special cards at a glance. <strong className="text-blue-300">2s</strong> are blue, <strong className="text-orange-300">7s</strong> are orange, and <strong className="text-red-300">10s</strong> are red — everywhere across the board.</p>
          <SpecialCardsMockup />
          <p>Find the toggle under <strong className="text-white">Settings → Gameplay</strong>.</p>
        </FeatureSection>

        {/* 3. Turn Flash */}
        <FeatureSection emoji="💡" title="Turn Flash Setting">
          <p>A new <strong className="text-white">Turn Flash</strong> toggle (Settings → Gameplay) briefly flashes the board yellow when it becomes your turn — totally separate from Beginner Mode and off by default.</p>
          <div className="flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-yellow-400/30 flex items-center justify-center">
              <span className="text-yellow-300 text-sm">💡</span>
            </div>
            <div>
              <div className="font-bold text-xs text-white">Turn Flash</div>
              <div className="text-[10px] text-green-300">Briefly flashes the board yellow on your turn</div>
            </div>
            <div className="ml-auto w-9 h-5 rounded-full bg-green-700 flex items-center px-0.5">
              <div className="w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
        </FeatureSection>

        {/* 4. Palace-valid animation */}
        <FeatureSection emoji="🏯" title="Palace Face-Down Animation">
          <p>Playing a face-down palace card now triggers an animation: valid plays show a <strong className="text-green-300">green grow effect</strong> with a <strong className="text-white">✅ Safe!</strong> label. Invalid plays continue to shake in red.</p>
          <PalaceValidMockup />
        </FeatureSection>

        {/* 5. Ranked safe display */}
        <FeatureSection emoji="🏆" title="Ranked Safe Display">
          <p>Players who finish safely are now ranked in order of elimination — <strong className="text-yellow-300">🥇 Gold!</strong> / <strong className="text-gray-300">🥈 Silver!</strong> / <strong className="text-orange-300">🥉 Bronze!</strong> — instead of the generic "Safe!" label.</p>
          <SafeRankingMockup />
        </FeatureSection>

        {/* 6. Interactive How to Play */}
        <FeatureSection emoji="📖" title="Interactive How to Play">
          <p>The <strong className="text-white">Card Hierarchy</strong> section now uses actual playing-card buttons. Click any rank to read its rule. Special cards display their beginner-mode colors.</p>
          <CardHierarchyMockup />
        </FeatureSection>

        {/* 7. Deck count for robot games */}
        <FeatureSection emoji="🃏" title="Card Decks for Robot Mode">
          <p>Choose <strong className="text-white">1, 2, or 3 decks</strong> when setting up a robot game from the home screen — same as multiplayer. More decks means longer games with more chaos.</p>
          <DeckSelectorMockup />
        </FeatureSection>

        {/* 8. Multiplayer deck count fix */}
        <FeatureSection emoji="🌐" title="Multiplayer Deck Count">
          <p>The host's deck selection is now correctly applied when starting an online multiplayer game. Pick 3 decks, get 3 decks.</p>
        </FeatureSection>

        {/* 9. Crown logo + OG banner */}
        <FeatureSection emoji="👑" title="Crown Logo & Social Banner">
          <p>Palace Royale has a new <strong className="text-yellow-300">crown favicon</strong> and <strong className="text-white">Open Graph social banner</strong> — share the game link and it shows up beautifully in messaging apps and social media.</p>
        </FeatureSection>

        {/* CTA */}
        <div className="pt-2">
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-yellow-500 text-black rounded-2xl font-bold text-lg hover:bg-yellow-400 active:scale-[0.98] transition-all shadow-lg shadow-yellow-500/20"
          >
            Let's Play! →
          </button>
        </div>
      </div>
    </div>
  );
}
