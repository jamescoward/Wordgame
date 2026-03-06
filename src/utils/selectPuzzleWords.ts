export const MAX_PUZZLE_WORDS = 14
export const MIN_PUZZLE_WORDS = 6

/**
 * Selects a balanced, capped subset of sub-words for a puzzle.
 *
 * Strategy:
 *  1. Deduplicate and sort into length buckets (3, 4, 5, 6, 7+).
 *  2. Fill from longest bucket first so longer (more valuable) words are always included.
 *  3. Round-robin fill remaining slots with shorter words so every length is represented.
 *  4. Sort final list: length asc, then alpha.
 */
export function selectPuzzleWords(words: string[]): string[] {
  if (words.length === 0) return []

  // Deduplicate
  const unique = [...new Set(words)]

  if (unique.length <= MAX_PUZZLE_WORDS) {
    return [...unique].sort((a, b) => a.length - b.length || a.localeCompare(b))
  }

  // Group into buckets by length, each bucket sorted alpha
  const buckets = new Map<number, string[]>()
  for (const w of unique) {
    const len = w.length
    if (!buckets.has(len)) buckets.set(len, [])
    buckets.get(len)!.push(w)
  }
  for (const bucket of buckets.values()) bucket.sort()

  // Sorted bucket lengths, longest first (to prioritise longer words)
  const lengths = [...buckets.keys()].sort((a, b) => b - a)

  const selected: string[] = []

  // Phase 1: include ALL words from the longest buckets until we'd exceed MAX
  for (const len of lengths) {
    const bucket = buckets.get(len)!
    if (selected.length + bucket.length <= MAX_PUZZLE_WORDS) {
      selected.push(...bucket)
      buckets.delete(len)
    } else {
      break
    }
  }

  // Phase 2: if we still have budget, fill remaining slots round-robin from remaining buckets
  // (shortest first so each length gets representation)
  const remaining = lengths
    .filter(l => buckets.has(l))
    .sort((a, b) => a - b)
    .map(l => ({ len: l, words: buckets.get(l)! }))

  let budget = MAX_PUZZLE_WORDS - selected.length
  let i = 0
  while (budget > 0 && remaining.some(b => b.words.length > 0)) {
    const bucket = remaining[i % remaining.length]
    if (bucket.words.length > 0) {
      selected.push(bucket.words.shift()!)
      budget--
    }
    i++
  }

  return selected.sort((a, b) => a.length - b.length || a.localeCompare(b))
}
