import { useNavigate } from 'react-router';
import { Crown, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface Section {
  id: string;
  title: string;
  emoji: string;
  content: React.ReactNode;
}

function Pill({ children, color = 'yellow' }: { children: React.ReactNode; color?: 'yellow' | 'red' | 'blue' | 'purple' | 'green' | 'orange' }) {
  const colors = {
    yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    red:    'bg-red-500/20 text-red-300 border-red-500/40',
    blue:   'bg-blue-500/20 text-blue-300 border-blue-500/40',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    green:  'bg-green-500/20 text-green-300 border-green-500/40',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${colors[color]}`}>
      {children}
    </span>
  );
}

function CardBadge({ rank, label }: { rank: string; label: string }) {
  const isRed = ['♥', '♦'].some(s => label.includes(s));
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-10 h-14 rounded-lg border-2 bg-white flex flex-col items-start justify-between p-0.5 shadow-md
        ${isRed ? 'border-red-400' : 'border-gray-400'}`}>
        <span className={`text-[11px] font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{rank}</span>
        <span className={`self-center text-base ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{label}</span>
        <span className={`text-[11px] font-bold leading-none self-end rotate-180 ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{rank}</span>
      </div>
    </div>
  );
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

function AccordionSection({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 active:scale-[0.99] transition-all text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{section.emoji}</span>
          <span className="font-bold text-sm text-white">{section.title}</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-green-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-green-400 shrink-0" />}
      </button>
      {open && (
        <div className="p-4 pt-2 bg-black/20 space-y-3 text-xs text-green-200 leading-relaxed">
          {section.content}
        </div>
      )}
    </div>
  );
}

const sections: Section[] = [
  {
    id: 'goal',
    title: 'Objective',
    emoji: '🏆',
    content: (
      <p>
        Be the first player to get rid of <strong className="text-white">all your cards</strong> — your hand,
        your face-up palace cards, and finally your face-down palace cards. The last player holding cards loses.
      </p>
    ),
  },
  {
    id: 'setup',
    title: 'Palace Setup',
    emoji: '🏰',
    content: (
      <div className="space-y-3">
        <p>At the start of the game each player is dealt <strong className="text-white">9 cards</strong> to set up their palace:</p>
        <ol className="space-y-2 list-none">
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>Choose <strong className="text-white">3 cards</strong> to place <strong className="text-white">face-down</strong> in your palace. These are your blind cards — you can't look at them until you play them!</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>From the remaining 6, choose <strong className="text-white">3 cards</strong> to place <strong className="text-white">face-up</strong> on top of the face-down cards.</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>The last <strong className="text-white">3 cards</strong> become your starting hand.</span>
          </li>
        </ol>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 text-yellow-200">
          💡 <strong>Tip:</strong> Put your strongest cards (Aces, 10s, 2s) face-up so you can see and use them strategically.
        </div>
      </div>
    ),
  },
  {
    id: 'gameplay',
    title: 'How to Play',
    emoji: '🃏',
    content: (
      <div className="space-y-3">
        <p>On your turn, play one or more cards of the <strong className="text-white">same rank</strong> onto the discard pile. The card(s) played must be <strong className="text-white">equal to or higher</strong> in value than the top card of the pile.</p>
        <div className="space-y-2">
          <RuleCard emoji="👆" title="Playing Multiple Cards">
            You can play multiple cards of the <strong className="text-white">same rank</strong> in a single turn (e.g. play three 7s at once). This is powerful because it counts toward four-of-a-kind combos!
          </RuleCard>
          <RuleCard emoji="🎴" title="Draw to Three">
            After playing from your hand, if the draw pile still has cards, draw back up to 3 cards in hand before the next player goes.
          </RuleCard>
          <RuleCard emoji="😬" title="Can't Play? Pick Up!">
            If you have no card that beats the top of the pile, you must pick up the <em>entire</em> pile and add it to your hand. Play then passes to the next player.
          </RuleCard>
        </div>
      </div>
    ),
  },
  {
    id: 'card-order',
    title: 'Card Hierarchy',
    emoji: '📊',
    content: (
      <div className="space-y-3">
        <p>Cards rank from lowest to highest. A card can only be played on a card of <strong className="text-white">equal or lower</strong> value (except special cards).</p>
        <div className="flex flex-wrap gap-1.5 justify-center py-1">
          {[
            { rank: '3', label: '♣' },
            { rank: '4', label: '♠' },
            { rank: '5', label: '♣' },
            { rank: '6', label: '♠' },
            { rank: '7', label: '♣' },
            { rank: '8', label: '♠' },
            { rank: '9', label: '♣' },
            { rank: 'J', label: '♠' },
            { rank: 'Q', label: '♣' },
            { rank: 'K', label: '♠' },
            { rank: 'A', label: '♣' },
          ].map(c => <CardBadge key={c.rank} rank={c.rank} label={c.label} />)}
        </div>
        <div className="text-center text-[11px] text-green-400">← lowest &nbsp;&nbsp;&nbsp; highest →</div>
        <p className="text-[11px]">Special cards <Pill color="yellow">2</Pill>, <Pill color="red">7</Pill>, and <Pill color="blue">10</Pill> have unique rules (see Special Cards section).</p>
      </div>
    ),
  },
  {
    id: 'special',
    title: 'Special Cards',
    emoji: '✨',
    content: (
      <div className="space-y-3">
        <div className="space-y-2">
          <RuleCard emoji="2️⃣" title="2 — Bonus Action">
            <p>A <strong className="text-white">2</strong> can be played on <em>any</em> card. After playing it, you immediately get a <strong className="text-white">bonus turn</strong> — play another card on top. You cannot end the game by playing a 2 as your last card; if you have no follow-up, you must pick up the pile.</p>
          </RuleCard>
          <RuleCard emoji="7️⃣" title="7 — Reversal">
            <p>A <strong className="text-white">7</strong> can be played on any card ranked 7 or lower. After a 7 is played, the next player must play a card ranked <strong className="text-white">7 or lower</strong> (or pick up).</p>
          </RuleCard>
          <RuleCard emoji="🔟" title="10 — Wipeout">
            <p>A <strong className="text-white">10</strong> can be played on any card. It <strong className="text-white">clears the entire pile</strong> — all cards are discarded. You then get a <strong className="text-white">bonus turn</strong> to start the new pile with any card you like.</p>
          </RuleCard>
          <RuleCard emoji="4️⃣" title="Four of a Kind — Wipeout + Steal">
            <p>If the top 4 cards of the pile are the same rank (completed over multiple turns), the pile is <strong className="text-white">wiped out</strong> and the player who completed the four-of-a-kind gets a bonus turn.</p>
            <p className="mt-1"><strong className="text-white">Turn Stealing:</strong> If any <em>other</em> player holds the cards needed to complete a four-of-a-kind on the pile, they can <Pill color="purple">Steal!</Pill> the turn, play their cards, wipe the pile, and take the bonus.</p>
          </RuleCard>
        </div>
      </div>
    ),
  },
  {
    id: 'palace',
    title: 'Playing the Palace',
    emoji: '🏯',
    content: (
      <div className="space-y-3">
        <p>Once your hand is empty and the draw pile is gone, you move on to your palace cards:</p>
        <ol className="space-y-2 list-none">
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-green-500 text-black text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span><strong className="text-white">Face-Up Palace Cards</strong> — play these like normal hand cards. You can see them, so choose wisely.</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-orange-500 text-black text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span><strong className="text-white">Face-Down Palace Cards (Blind)</strong> — once all face-up cards are gone, flip and play one face-down card at a time. You don't know what it is until it's played!</span>
          </li>
        </ol>
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 text-orange-200">
          ⚠️ If a blind card can't be played on the pile, you must pick up the <em>entire</em> pile (including the revealed card) and add it to your hand.
        </div>
      </div>
    ),
  },
  {
    id: 'winning',
    title: 'Winning & Losing',
    emoji: '🥇',
    content: (
      <div className="space-y-3">
        <RuleCard emoji="🏆" title="Winning">
          The first player to play their last palace card (and it's a valid play) wins the round. In multi-player games, play continues until only one player remains with cards.
        </RuleCard>
        <RuleCard emoji="😅" title="No 2 Endings">
          You <strong className="text-white">cannot end the game</strong> by playing a 2 as your very last card. Since a 2 requires a bonus action, you'd have no card to follow up with — so you pick up the pile instead.
        </RuleCard>
        <RuleCard emoji="👑" title="Last Player Loses">
          The last remaining player still holding cards is the loser (the "Palace" player). In casual play, they deal the next game!
        </RuleCard>
      </div>
    ),
  },
  {
    id: 'tips',
    title: 'Strategy Tips',
    emoji: '🧠',
    content: (
      <div className="space-y-2">
        <RuleCard emoji="⬆️" title="Load Up Your Palace">
          Place your Aces, 10s, and 2s face-up in your palace. You'll be glad to have them as safety nets when your hand is gone.
        </RuleCard>
        <RuleCard emoji="📦" title="Save Your Nukes">
          Hold onto 10s and four-of-a-kind combos for when the pile is getting dangerously high — wiping it saves everyone else from having to pick up, but especially helps you.
        </RuleCard>
        <RuleCard emoji="👁️" title="Watch the Pile">
          Pay attention to the top card and how close the pile is to a four-of-a-kind. If you hold the completing card, be ready to steal the turn!
        </RuleCard>
        <RuleCard emoji="7️⃣" title="Use 7s Offensively">
          Dropping a 7 when opponents have big cards traps them. They'll be forced to pick up if they can't play a low card.
        </RuleCard>
      </div>
    ),
  },
];

export default function HowToPlayPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-green-900/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-lg">How to Play Palace</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-3 pb-12">
        {/* Quick summary card */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-yellow-300">
            <span className="text-lg">⚡</span> Quick Summary
          </div>
          <p className="text-sm text-yellow-100 leading-relaxed">
            Palace is a shedding card game for <strong>2–4 players</strong>. Play cards equal to or higher than the top of the pile. Use special cards to flip the game. First to empty their hand <em>and</em> palace wins!
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Pill color="green">2–4 Players</Pill>
            <Pill color="yellow">Standard Deck</Pill>
            <Pill color="blue">~20 min</Pill>
            <Pill color="purple">All Ages</Pill>
          </div>
        </div>

        {/* Accordion sections */}
        {sections.map(section => (
          <AccordionSection key={section.id} section={section} />
        ))}

        {/* Play now CTA */}
        <div className="pt-4">
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-yellow-500 text-black rounded-2xl font-bold text-lg hover:bg-yellow-400 active:scale-[0.98] transition-all shadow-lg shadow-yellow-500/20"
          >
            Play Now →
          </button>
        </div>
      </div>
    </div>
  );
}
