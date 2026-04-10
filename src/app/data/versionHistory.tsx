/**
 * Version history data structure.
 * Each entry describes a release: its version number, a short summary, and a
 * Content component that renders the feature list for that release.
 *
 * The VERSION_HISTORY array is ordered from most-recent to least-recent.
 * WhatsNewPage shows VERSION_HISTORY[0] as the "What's New" page.
 * VersionLogPage shows the full array.
 */

// ---- Shared helper components ----

export function FeatureSection({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
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

export function Chip({ children, color = 'green' }: { children: React.ReactNode; color?: 'green' | 'yellow' | 'blue' | 'purple' | 'orange' | 'red' }) {
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

// ---- v0.6.0 helper mockups ----

function MiniCard({ rank, bg = 'bg-white' }: { rank: string; bg?: string }) {
  return (
    <div className={`w-9 h-12 rounded-md border-2 border-gray-300 ${bg} flex flex-col items-start justify-between p-0.5 shadow-sm shrink-0`}>
      <span className="text-[9px] font-bold leading-none text-gray-900">{rank}</span>
      <span className="self-center text-xs text-gray-900">♠</span>
      <span className="text-[9px] font-bold leading-none self-end rotate-180 text-gray-900">{rank}</span>
    </div>
  );
}

function FaceDownCard({ glow = false }: { glow?: boolean }) {
  return (
    <div className={`w-9 h-12 rounded-md border-2 border-blue-400 bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center shadow-sm shrink-0 ${glow ? 'ring-2 ring-green-400 shadow-green-400/50 shadow-md' : ''}`}>
      <span className="text-white text-sm font-bold">♠</span>
    </div>
  );
}

function PalaceValidMockup() {
  return (
    <div className="relative bg-green-900/30 border border-green-400/40 rounded-lg p-3 flex flex-col items-center gap-2">
      <div className="flex gap-2 items-end">
        <FaceDownCard />
        <FaceDownCard />
        <div className="relative">
          <MiniCard rank="K" />
          <div className="absolute inset-0 rounded-md bg-green-400/50 flex items-center justify-center">
            <span className="text-[8px] font-black text-white">✅</span>
          </div>
        </div>
      </div>
      <span className="text-green-300 text-[10px] font-bold">✅ Safe! Face-down card played!</span>
    </div>
  );
}

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

// ---- v0.6.1 helper mockups ----

function ChatViewMockup() {
  return (
    <div className="relative bg-black/30 border border-white/20 rounded-xl overflow-hidden" style={{ height: 140 }}>
      {/* Main board area */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-900 to-green-800 flex items-end justify-center pb-3 gap-2">
        <div className="w-8 h-10 rounded bg-white/20 border border-white/30" />
        <div className="w-8 h-10 rounded bg-white/20 border border-white/30" />
        <div className="w-8 h-10 rounded bg-white/20 border border-white/30" />
      </div>
      {/* Floating opponent overlay (top-right) */}
      <div className="absolute top-2 right-2 w-20 bg-black/70 border border-white/30 rounded-lg p-1.5 flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <span className="text-sm">⚔️</span>
          <span className="text-[9px] font-bold text-yellow-300 truncate">Arthur ⭐</span>
        </div>
        {/* Palace cards (visible in palace phase) */}
        <div className="flex gap-0.5 justify-center">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-4 h-5 rounded bg-gradient-to-br from-blue-700 to-blue-900 border border-blue-400/60 flex items-center justify-center">
              <span className="text-[6px] text-white">♠</span>
            </div>
          ))}
        </div>
        <div className="text-[8px] text-green-300 text-center">Palace</div>
        {/* Align toggle (visual only, non-interactive) */}
        <div className="self-end text-[8px] text-white/50">◀</div>
      </div>
      {/* Last played info */}
      <div className="absolute bottom-1 right-2 text-[7px] text-green-400 bg-black/60 rounded px-1 py-0.5">
        Last: 🦁 James · 🥇2
      </div>
      {/* Chat toggle button */}
      <div className="absolute bottom-3 left-2 w-6 h-6 rounded bg-purple-600 flex items-center justify-center">
        <span className="text-[10px]">📹</span>
      </div>
    </div>
  );
}

// ---- v0.7.1 helper mockups ----

function EliminatedChatMockup() {
  return (
    <div className="flex flex-col gap-1.5">
      {[
        { name: 'Arthur', emoji: '⚔️', award: '🥇', color: 'text-yellow-300', label: 'Gold!' },
        { name: 'Henry',  emoji: '🛡️', award: '🥈', color: 'text-gray-300',   label: 'Silver!' },
        { name: 'You',    emoji: '🦁', award: null,  color: 'text-green-300',  label: 'Playing…' },
      ].map(p => (
        <div key={p.name} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
          <span className="text-base">{p.emoji}</span>
          <span className={`text-[10px] font-bold ${p.color} flex-1`}>{p.name}</span>
          {p.award
            ? <span className="text-xs">{p.award} <span className={`font-bold ${p.color}`}>{p.label}</span></span>
            : <span className="text-[10px] text-green-400">{p.label}</span>}
        </div>
      ))}
    </div>
  );
}

function OneCardLeftMockup() {
  return (
    <div className="flex flex-col items-center gap-2 bg-black/30 rounded-xl p-3">
      <div className="flex items-center gap-2 bg-orange-500/20 border border-orange-400/50 rounded-full px-4 py-2 animate-pulse">
        <span className="text-lg">⚠️</span>
        <span className="text-xs font-bold text-orange-200">Arthur — 1 card left!</span>
      </div>
      <div className="flex gap-1 justify-center">
        <div className="w-8 h-11 rounded-md bg-gradient-to-br from-blue-700 to-blue-900 border border-blue-400 flex items-center justify-center shadow-md">
          <span className="text-white text-xs font-bold">♠</span>
        </div>
      </div>
    </div>
  );
}

function ExportImportMockup() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-400/30 rounded-lg px-3 py-2">
        <span className="text-base">📤</span>
        <div className="flex-1">
          <div className="text-[10px] font-bold text-blue-200">Export Rankings</div>
          <div className="text-[9px] text-blue-400">Save your stats as a file</div>
        </div>
        <span className="text-[9px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">Export</span>
      </div>
      <div className="flex items-center gap-2 bg-green-500/10 border border-green-400/30 rounded-lg px-3 py-2">
        <span className="text-base">📥</span>
        <div className="flex-1">
          <div className="text-[10px] font-bold text-green-200">Import Rankings</div>
          <div className="text-[9px] text-green-400">Restore from a file or another device</div>
        </div>
        <span className="text-[9px] font-bold bg-green-600 text-white px-2 py-0.5 rounded-full">Import</span>
      </div>
    </div>
  );
}

function ToolbarMockup() {
  const buttons = [
    { icon: '💬', label: 'Chat' },
    { icon: '⚙️', label: 'Settings' },
    { icon: '📖', label: 'How-to' },
    { icon: '📹', label: 'Video' },
  ];
  return (
    <div className="flex justify-around bg-black/40 border border-white/15 rounded-xl px-2 py-2">
      {buttons.map(b => (
        <div key={b.label} className="flex flex-col items-center gap-0.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base">{b.icon}</div>
          <span className="text-[8px] text-green-300">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function NearMissMockup() {
  return (
    <div className="flex flex-col items-center gap-2 bg-black/30 rounded-xl p-3">
      <div className="flex gap-2 items-center justify-center">
        {['A', 'K', '?'].map((r, i) => (
          <div key={i} className={`w-9 h-12 rounded-md border-2 flex items-center justify-center shadow-sm ${
            i < 2 ? 'bg-white border-gray-300 text-gray-900 font-bold text-sm' : 'bg-gradient-to-br from-blue-700 to-blue-900 border-red-400 ring-2 ring-red-500/60'
          }`}>
            {i < 2 ? r : <span className="text-white text-xs font-bold">♠</span>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-400/40 rounded-lg px-3 py-1">
        <span className="text-sm">😬</span>
        <span className="text-[10px] font-bold text-red-200">So close! Pick up the pile</span>
      </div>
    </div>
  );
}

function InGameChatMockup() {
  const presets = ['GG!', 'Nice play!', 'Oops 😅', 'Let\'s go! 🔥'];
  return (
    <div className="flex flex-col gap-2 bg-black/30 rounded-xl p-3">
      <div className="text-[9px] text-green-400 font-bold uppercase tracking-wide">Quick presets</div>
      <div className="flex flex-wrap gap-1">
        {presets.map(p => (
          <span key={p} className="px-2 py-1 bg-white/10 border border-white/20 rounded-full text-[9px] text-white">{p}</span>
        ))}
      </div>
      <div className="flex items-center gap-1.5 bg-white/5 border border-white/20 rounded-lg px-2 py-1.5">
        <input readOnly value="Your custom message…" className="flex-1 bg-transparent text-[10px] text-white/50 outline-none cursor-default" />
        <span className="text-[9px] text-green-400 font-bold">45</span>
      </div>
    </div>
  );
}

// ---- v0.7.0 helper mockups ----

function TutorialMockup() {
  return (
    <div className="flex items-center gap-3 bg-yellow-500/20 border border-yellow-400/40 rounded-xl px-4 py-3">
      <span className="text-2xl">🎓</span>
      <div className="flex-1 text-left">
        <div className="font-bold text-yellow-100 text-xs">Learn to Play</div>
        <div className="text-[10px] text-yellow-300">Guided tutorial — swipe to dismiss</div>
      </div>
      <span className="text-[10px] font-bold bg-yellow-500 text-black px-1.5 py-0.5 rounded-full">START</span>
    </div>
  );
}

function PaginatedHandMockup() {
  return (
    <div className="flex flex-col items-center gap-2 bg-white/5 rounded-xl p-3">
      <div className="flex gap-1 items-center">
        <span className="text-green-400 text-lg">‹</span>
        {[...'AKQJ1098'].map((r, i) => (
          <div key={i} className="w-7 h-9 rounded bg-white border border-gray-300 flex items-center justify-center text-[9px] font-bold text-gray-800">{r}</div>
        ))}
        <span className="text-green-400 text-lg">›</span>
      </div>
      <div className="text-[10px] text-green-400 font-semibold">1 / 2</div>
    </div>
  );
}

// ---- Version content components ----

export function V071Content() {
  return (
    <>
      <FeatureSection emoji="💬" title="In-Game Chat — Multiplayer">
        <p>Chat with your opponents during any online match! Choose from <strong className="text-white">quick preset messages</strong> or type your own — up to <strong className="text-white">45 characters</strong>. Messages appear in the game feed in real time so everyone stays in the loop.</p>
        <InGameChatMockup />
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="purple">Multiplayer</Chip>
          <Chip color="green">Preset messages</Chip>
          <Chip color="blue">Custom up to 45 chars</Chip>
        </div>
      </FeatureSection>

      <FeatureSection emoji="🛠️" title="Improved In-Game Toolbar">
        <p>The in-game toolbar has been upgraded with quick-access buttons for <strong className="text-white">💬 Chat</strong>, <strong className="text-white">⚙️ Settings</strong>, <strong className="text-white">📖 How-to-Play</strong>, and <strong className="text-white">📹 Video Mode</strong> — all reachable without leaving the game.</p>
        <ToolbarMockup />
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="yellow">All game modes</Chip>
          <Chip color="green">One-tap access</Chip>
        </div>
      </FeatureSection>

      <FeatureSection emoji="😬" title="Near-Miss Feedback in Palace">
        <p>When you flip a face-down palace card and it doesn't beat the pile, you now see a <strong className="text-white">near-miss reaction</strong> — a brief animated message so you know exactly what happened before picking up the pile.</p>
        <NearMissMockup />
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="orange">Face-down phase</Chip>
          <Chip color="red">Near-miss animation</Chip>
        </div>
      </FeatureSection>

      <FeatureSection emoji="⚠️" title={`Animated "1 Card Left" Announcement`}>
        <p>When any player is down to their <strong className="text-white">last palace card</strong>, a pulsing announcement banner highlights the moment for everyone at the table — building tension as the endgame approaches.</p>
        <OneCardLeftMockup />
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="orange">All players</Chip>
          <Chip color="yellow">Animated banner</Chip>
        </div>
      </FeatureSection>

      <FeatureSection emoji="🏆" title="Eliminated Players in Chat Mode">
        <p>In <strong className="text-white">Chat / Video Mode</strong>, players who have safely finished now display their <strong className="text-white">award badge</strong> (🥇 Gold, 🥈 Silver, 🥉 Bronze) right next to their name — so you can see the leaderboard at a glance without leaving the view.</p>
        <EliminatedChatMockup />
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="yellow">Chat Mode</Chip>
          <Chip color="green">Live leaderboard</Chip>
        </div>
      </FeatureSection>

      <FeatureSection emoji="📤" title="Export / Import Your Rankings">
        <p>Head to <strong className="text-white">Settings → Rankings</strong> to export your stats as a file or import them from a previous backup. Great for switching devices or sharing your record with friends.</p>
        <ExportImportMockup />
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="blue">Settings → Rankings</Chip>
          <Chip color="green">Backup & restore</Chip>
          <Chip color="purple">Cross-device</Chip>
        </div>
      </FeatureSection>
    </>
  );
}

export function V070Content() {
  return (
    <>
      <FeatureSection emoji="🎓" title="Interactive Tutorial">
        <p>First-time players are greeted with a swipeable <strong className="text-white">Learn to Play</strong> banner on the home screen. Tapping it launches a guided game that walks through special cards, bonus turns, palace mechanics, and end-game scenarios step by step.</p>
        <TutorialMockup />
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="yellow">First-time players</Chip>
          <Chip color="green">Swipe to dismiss</Chip>
          <Chip color="blue">Replayable in Settings</Chip>
        </div>
        <p>Swipe the banner to reveal a dismiss button. Once completed or dismissed, the tutorial can always be replayed from the <strong className="text-white">Settings</strong> page.</p>
      </FeatureSection>

      <FeatureSection emoji="📹" title="Chat View in Single-Player">
        <p>The <strong className="text-white">📹 Chat View</strong> floating opponent overlay — previously available only in online multiplayer — now works in all game modes, including solo robot games. Tap the camera icon above your hand to toggle it during any match.</p>
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="purple">All game modes</Chip>
          <Chip color="blue">Auto-tracks turns</Chip>
        </div>
      </FeatureSection>

      <FeatureSection emoji="🃏" title="Paginated Hand & Smart Sorting">
        <p>When your hand exceeds <strong className="text-white">10 cards</strong>, it splits into pages with left/right chevron navigation. On your turn, <strong className="text-green-300">playable cards</strong> are automatically sorted to the front so you can act faster.</p>
        <PaginatedHandMockup />
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="green">Playable cards first</Chip>
          <Chip color="yellow">Page indicator</Chip>
          <Chip color="blue">Auto-resets on hand change</Chip>
        </div>
      </FeatureSection>

      <FeatureSection emoji="💾" title="Player Name Persistence">
        <p>Your name is now <strong className="text-white">saved automatically</strong> when you start a game and pre-filled on your next visit. No more retyping your name every session.</p>
      </FeatureSection>

      <FeatureSection emoji="✨" title="Polish & Bug Fixes">
        <p><strong className="text-white">Card setup animations</strong> — selecting palace cards now animates with a subtle tilt and lift. <strong className="text-white">Selected card glow</strong> adds a yellow shadow highlight during setup. <strong className="text-white">Opponent palace rotations</strong> give each opponent's palace a unique, deterministic tilt.</p>
        <p><strong className="text-white">Particle effects</strong> now correctly respect the toggle in Settings — two cases where animations fired regardless of the setting have been fixed.</p>
        <p>The <strong className="text-white">Home Page</strong> received a layout refresh: horizontal crown + title row, left-aligned content, and a new tagline. The footer no longer overlaps page content on taller screens.</p>
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="orange">Bug fix</Chip>
          <Chip color="green">Visual polish</Chip>
          <Chip color="yellow">UI improvements</Chip>
        </div>
      </FeatureSection>
    </>
  );
}

export function V061Content() {
  return (
    <>
      <FeatureSection emoji="📹" title="Chat View — Floating Opponent Overlay">
        <p>Tap the <strong className="text-white">📹</strong> button above your hand in online multiplayer to toggle a compact floating view of the active opponent. It automatically rotates to whoever's turn it is.</p>
        <ChatViewMockup />
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="purple">Multiplayer only</Chip>
          <Chip color="blue">Auto-tracks turns</Chip>
          <Chip color="green">Left / Right align</Chip>
        </div>
        <p>When the opponent plays from their <strong className="text-white">palace</strong>, palace cards are shown. While they still have hand cards, only the hand count is visible.</p>
        <p>Below the floating view: see the name and achievements of the player who played just before the current turn.</p>
      </FeatureSection>

      <FeatureSection emoji="📋" title="Version History Log">
        <p>A new <strong className="text-white">Version History</strong> page (Settings → Version History) shows every What's New release from newest to oldest.</p>
        <p>The structure is built so future releases are automatically added to the log as they are published — no manual wiring needed.</p>
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="yellow">All releases</Chip>
          <Chip color="orange">Newest first</Chip>
        </div>
      </FeatureSection>
    </>
  );
}

export function V060Content() {
  return (
    <>
      {/* Version banner */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2 font-bold text-yellow-300">
          <span className="text-lg">🚀</span> Palace Royale v0.6.0
        </div>
        <p className="text-sm text-yellow-100 leading-relaxed">
          This release brings <strong>knight-named AI bots</strong>, a <strong>beginner mode</strong>, palace animations, and a stack of quality-of-life improvements.
        </p>
      </div>

      <FeatureSection emoji="⚔️" title="Knight-Named Bot Profiles">
        <p>Meet 8 unique AI opponents, each with their own personality, play style, and reaction speed. From the lightning-fast <strong className="text-white">James</strong> to the brooding <strong className="text-white">Thomas</strong>, every match feels different.</p>
        <BotRosterMockup />
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Chip color="yellow">Variable timing</Chip>
          <Chip color="purple">Counter tendency</Chip>
          <Chip color="red">Risk tolerance</Chip>
        </div>
      </FeatureSection>

      <FeatureSection emoji="🎓" title="Beginner Mode">
        <p>Enable <strong className="text-white">Beginner Mode</strong> in Settings to color-code special cards at a glance. <strong className="text-blue-300">2s</strong> are blue, <strong className="text-orange-300">7s</strong> are orange, and <strong className="text-red-300">10s</strong> are red — everywhere across the board.</p>
        <SpecialCardsMockup />
        <p>Find the toggle under <strong className="text-white">Settings → Gameplay</strong>.</p>
      </FeatureSection>

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

      <FeatureSection emoji="🏯" title="Palace Face-Down Animation">
        <p>Playing a face-down palace card now triggers an animation: valid plays show a <strong className="text-green-300">green grow effect</strong> with a <strong className="text-white">✅ Safe!</strong> label. Invalid plays continue to shake in red.</p>
        <PalaceValidMockup />
      </FeatureSection>

      <FeatureSection emoji="🏆" title="Ranked Safe Display">
        <p>Players who finish safely are now ranked in order of elimination — <strong className="text-yellow-300">🥇 Gold!</strong> / <strong className="text-gray-300">🥈 Silver!</strong> / <strong className="text-orange-300">🥉 Bronze!</strong> — instead of the generic "Safe!" label.</p>
        <SafeRankingMockup />
      </FeatureSection>

      <FeatureSection emoji="🃏" title="Card Decks for Robot Mode">
        <p>Choose <strong className="text-white">1, 2, or 3 decks</strong> when setting up a robot game from the home screen — same as multiplayer. More decks means longer games with more chaos.</p>
        <DeckSelectorMockup />
      </FeatureSection>

      <FeatureSection emoji="🌐" title="Multiplayer Deck Count">
        <p>The host's deck selection is now correctly applied when starting an online multiplayer game. Pick 3 decks, get 3 decks.</p>
      </FeatureSection>

      <FeatureSection emoji="👑" title="Crown Logo & Social Banner">
        <p>Palace Royale has a new <strong className="text-yellow-300">crown favicon</strong> and <strong className="text-white">Open Graph social banner</strong> — share the game link and it shows up beautifully in messaging apps and social media.</p>
      </FeatureSection>
    </>
  );
}

// ---- Version history data structure ----

export interface VersionEntry {
  version: string;
  date: string;
  summary: string;
  Content: () => React.ReactElement;
}

/**
 * All released versions, most-recent first.
 * Add new entries to the TOP of this array with each release.
 */
export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '0.7.1',
    date: 'April 2026',
    summary: 'In-game chat, improved toolbar, near-miss feedback, "1 card left" announcements & export/import rankings',
    Content: V071Content,
  },
  {
    version: '0.7.0',
    date: 'March 2026',
    summary: 'Interactive tutorial, paginated hand, chat view everywhere & polish',
    Content: V070Content,
  },
  {
    version: '0.6.1',
    date: 'March 2026',
    summary: 'Chat View for online multiplayer & Version History log',
    Content: V061Content,
  },
  {
    version: '0.6.0',
    date: 'February 2026',
    summary: 'Knight bots, beginner mode, palace animations & more',
    Content: V060Content,
  },
];
