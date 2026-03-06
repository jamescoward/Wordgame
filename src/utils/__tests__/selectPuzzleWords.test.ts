/**
 * TDD for selectPuzzleWords — RED first, then implement to go GREEN.
 *
 * Design goals:
 *  - Cap puzzle word count at MAX_PUZZLE_WORDS (~15)
 *  - Ensure variety across word lengths (bucket selection)
 *  - Always include at least one word from each available length bucket
 *  - Return sorted by length asc, then alpha
 *  - Never include duplicates
 */
import { describe, it, expect } from 'vitest'
import { selectPuzzleWords, MAX_PUZZLE_WORDS, MIN_PUZZLE_WORDS } from '../selectPuzzleWords'

// Helpers to build word arrays of a given length
const words3 = ['ACE','ACT','ADD','AGE','AGO','AID','AIM','AIR','ALE','ALL']
const words4 = ['ABLE','ACHE','ACID','ACRE','AGED','AIDE','AILS','AIMS','AIRY','ALSO']
const words5 = ['ABBEY','ABIDE','ABLER','ABODE','ABOUT','ABOVE','ABUSE','ACORN','ACRES','ACTED']
const words6 = ['ABSORB','ACCENT','ACCEPT','ACCESS','ACCORD','ACHING','ACROSS','ACTING','ACTION','ACTIVE']
const words7 = ['ABANDON','ABSENCE','ACCLAIM','ACCOUNT','ACHIEVE','ACQUIRE']

describe('selectPuzzleWords', () => {
  it('returns at most MAX_PUZZLE_WORDS words', () => {
    const all = [...words3, ...words4, ...words5, ...words6, ...words7]
    const result = selectPuzzleWords(all)
    expect(result.length).toBeLessThanOrEqual(MAX_PUZZLE_WORDS)
  })

  it('returns all words when total is under MAX_PUZZLE_WORDS', () => {
    const small = ['ACE', 'ACT', 'ABLE', 'ACHE']
    const result = selectPuzzleWords(small)
    expect(result).toHaveLength(4)
    expect(result).toEqual(expect.arrayContaining(small))
  })

  it('includes words from at least 2 different length buckets when available', () => {
    const mixed = [...words3, ...words5]
    const result = selectPuzzleWords(mixed)
    const lengths = new Set(result.map(w => w.length))
    expect(lengths.size).toBeGreaterThanOrEqual(2)
  })

  it('includes at least one word from each bucket when total allows', () => {
    const mixed = [
      ...words3.slice(0, 3),   // 3 × 3-letter
      ...words4.slice(0, 3),   // 3 × 4-letter
      ...words5.slice(0, 3),   // 3 × 5-letter
    ]
    const result = selectPuzzleWords(mixed)
    const lengths = new Set(result.map(w => w.length))
    expect(lengths.has(3)).toBe(true)
    expect(lengths.has(4)).toBe(true)
    expect(lengths.has(5)).toBe(true)
  })

  it('returns no duplicates', () => {
    const all = [...words3, ...words3, ...words4] // intentional duplicates
    const result = selectPuzzleWords(all)
    expect(result).toHaveLength(new Set(result).size)
  })

  it('is sorted by length ascending, then alphabetically', () => {
    const all = [...words5, ...words3, ...words4]
    const result = selectPuzzleWords(all)
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1]
      const curr = result[i]
      if (prev.length === curr.length) {
        expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0)
      } else {
        expect(prev.length).toBeLessThanOrEqual(curr.length)
      }
    }
  })

  it('returns empty array for empty input', () => {
    expect(selectPuzzleWords([])).toEqual([])
  })

  it('exports MAX_PUZZLE_WORDS = 15', () => {
    expect(MAX_PUZZLE_WORDS).toBe(15)
  })

  it('exports MIN_PUZZLE_WORDS = 6', () => {
    expect(MIN_PUZZLE_WORDS).toBe(6)
  })

  it('prioritises longer words when budget is tight', () => {
    // 20 words total (10×3-letter + 10×5-letter) — capped at 15
    // Should include all 5-letter words (10) and fill remaining 5 slots with 3-letter
    const all = [...words3, ...words5] // 10 + 10 = 20
    const result = selectPuzzleWords(all)
    expect(result.length).toBe(MAX_PUZZLE_WORDS)
    const fiveLetterCount = result.filter(w => w.length === 5).length
    // All 5-letter words should be included (they are more valuable)
    expect(fiveLetterCount).toBe(words5.length)
  })
})
