/** Shared emoji constants and utilities. */

export const PLAYER_EMOJIS = ['🦆', '🐻', '🦁', '🐸', '🦊', '🐺', '🦝', '🐼', '🦋', '🐠', '🦄', '🐯'];

/**
 * Extract the first emoji or grapheme cluster from an input string.
 * Uses Intl.Segmenter where available, with a fallback for older browsers.
 */
export function extractFirstEmoji(value: string): string | null {
  if (!value) return null;
  try {
    const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
    const segments = [...segmenter.segment(value)] as { segment: string }[];
    const emojiSeg = segments.find((s: { segment: string }) => /\p{Extended_Pictographic}/u.test(s.segment));
    return emojiSeg?.segment ?? segments[0]?.segment ?? null;
  } catch {
    // Fallback: take the first two code points (covers most composed emoji sequences)
    const first = Array.from(value).slice(0, 2).join('');
    return first || null;
  }
}
