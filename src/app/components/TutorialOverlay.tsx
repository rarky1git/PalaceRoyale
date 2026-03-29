import { motion, AnimatePresence } from 'motion/react';

export const TUTORIAL_SEEN_KEY = 'palace-tutorial-seen';

export interface TutorialStep {
  title: string;
  body: string;
  hint?: string;
  /** Which game phase this step belongs to — informational only */
  phase: 'setup' | 'playing' | 'endgame';
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    phase: 'setup',
    title: 'Welcome to Palace! 👑',
    body: 'Palace is a card-shedding game. Be the first to get rid of all your cards to win — the last player left loses!',
    hint: 'Tap Next to continue',
  },
  {
    phase: 'setup',
    title: 'Setting Up Your Palace',
    body: 'You start with 9 cards. First, pick 3 cards to place face-down in your palace (you can\'t see them — choose blind!). Then pick 3 more to place face-up on top. The remaining 3 go to your hand.',
    hint: 'Select 3 cards, then tap Confirm Selection',
  },
  {
    phase: 'playing',
    title: 'Playing Cards',
    body: 'On your turn, play one or more cards of the same rank onto the pile. You must play equal to or higher than the top pile card. If you can\'t play, pick up the whole pile!',
    hint: 'Tap a card to select it, then tap Play',
  },
  {
    phase: 'playing',
    title: '2 — Reset Card',
    body: 'The 2 is a special "reset" card. You can play it on anything — even an Ace — and it resets the pile rank to 2, letting the next player play almost any card.',
    hint: 'Look for 2s in your hand — they are always playable!',
  },
  {
    phase: 'playing',
    title: '10 — Wipeout Card 🔥',
    body: 'Playing a 10 burns the entire pile (it goes to the discard, not the pickup pile). As a reward, you get a free bonus turn — you can play any card next!',
    hint: 'After playing a 10, watch the bonus turn prompt appear',
  },
  {
    phase: 'playing',
    title: 'Four of a Kind — Wipeout! 💥',
    body: 'Playing four cards of the same rank at once (e.g., four 7s) also burns the pile and earns you a bonus turn. You can build up to four-of-a-kind over multiple plays too!',
    hint: 'Select all four cards of the same rank, then tap Play',
  },
  {
    phase: 'playing',
    title: 'Palace Cards 🏰',
    body: 'Once your hand and the draw pile are empty, you play from your palace. Start with the 3 face-up cards. When those are gone, flip and play the face-down cards one at a time — you don\'t know what you\'ll get!',
    hint: 'If a face-down card can\'t be played, you pick up the pile',
  },
  {
    phase: 'endgame',
    title: 'Finishing the Game 🏆',
    body: 'Clear all your palace cards and you\'re safe! The game ends when only one player still has cards — they\'re the loser. Aim for Gold (1st), Silver (2nd), or Bronze (3rd).',
    hint: 'Good luck — may the best Palace player win!',
  },
];

interface TutorialOverlayProps {
  step: number; // 1-based; 0 = hidden
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({ step, totalSteps, onNext, onSkip }: TutorialOverlayProps) {
  if (step < 1 || step > totalSteps) return null;
  const tutStep = TUTORIAL_STEPS[step - 1];
  const isLast = step === totalSteps;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        className="absolute inset-0 z-50 flex items-end justify-center pb-6 px-4 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Dim backdrop — only partial so the game is still visible */}
        <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={onNext} />

        {/* Card */}
        <motion.div
          className="relative z-10 w-full max-w-sm bg-green-950 border border-yellow-400/40 rounded-2xl p-5 shadow-2xl pointer-events-auto"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Progress dots */}
          <div className="flex gap-1.5 justify-center mb-3">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i + 1 === step ? 'w-5 bg-yellow-400' : i + 1 < step ? 'w-2.5 bg-yellow-600' : 'w-2.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <h2 className="text-base font-bold text-yellow-300 mb-2 text-center">{tutStep.title}</h2>
          <p className="text-sm text-green-100 leading-relaxed text-center mb-3">{tutStep.body}</p>
          {tutStep.hint && (
            <p className="text-xs text-green-400 italic text-center mb-4">💡 {tutStep.hint}</p>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 py-2 rounded-xl bg-white/10 text-green-300 text-sm font-semibold hover:bg-white/20 active:scale-[0.98] transition-all"
            >
              {isLast ? 'Got it!' : 'Skip'}
            </button>
            {!isLast && (
              <button
                onClick={onNext}
                className="flex-1 py-2 rounded-xl bg-yellow-500 text-black text-sm font-bold hover:bg-yellow-400 active:scale-[0.98] transition-all"
              >
                Next →
              </button>
            )}
            {isLast && (
              <button
                onClick={onNext}
                className="flex-1 py-2 rounded-xl bg-yellow-500 text-black text-sm font-bold hover:bg-yellow-400 active:scale-[0.98] transition-all"
              >
                Play! 🎮
              </button>
            )}
          </div>

          {/* Step counter */}
          <p className="text-[10px] text-green-600 text-center mt-2">{step} / {totalSteps}</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
