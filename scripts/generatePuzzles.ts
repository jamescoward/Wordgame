import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { WORD_LIST } from './wordlist.ts'
import type { Puzzle } from '../src/types.ts'
import { selectPuzzleWords, MIN_PUZZLE_WORDS, MAX_PUZZLE_WORDS } from '../src/utils/selectPuzzleWords.ts'

// Deduplicate and normalise word list
const ALL_WORDS = new Set(WORD_LIST.map(w => w.toUpperCase()))

/**
 * Returns true if `word` can be formed using only the letters in `available`.
 * Handles duplicates correctly.
 */
function canFormWord(word: string, available: string[]): boolean {
  const pool = [...available]
  for (const ch of word) {
    const idx = pool.indexOf(ch)
    if (idx === -1) return false
    pool.splice(idx, 1)
  }
  return true
}

/**
 * Find all valid sub-words (3+ letters) that can be formed from the given letters.
 */
function findSubWords(letters: string[]): string[] {
  const results: string[] = []
  for (const word of ALL_WORDS) {
    if (word.length < 3) continue
    if (word.length > letters.length) continue
    if (canFormWord(word, letters)) {
      results.push(word)
    }
  }
  return results.sort((a, b) => a.length - b.length || a.localeCompare(b))
}

/**
 * Generate puzzles from the word list.
 * Main words are 6-9 letters; keep puzzles with MIN_PUZZLE_WORDS–MAX_PUZZLE_WORDS valid sub-words.
 */
function generatePuzzles(count: number): Puzzle[] {
  // Candidate main words: 6-9 letters
  const candidates = WORD_LIST
    .map(w => w.toUpperCase())
    .filter(w => w.length >= 6 && w.length <= 9)
    .filter((w, i, arr) => arr.indexOf(w) === i) // deduplicate

  const puzzles: Puzzle[] = []
  let id = 1

  for (const mainWord of candidates) {
    if (puzzles.length >= count) break

    const letters = mainWord.split('')
    const allSubWords = findSubWords(letters)

    // Must be a valid word in the dictionary
    if (!ALL_WORDS.has(mainWord)) continue
    // Must have enough raw sub-words to produce a satisfying puzzle
    if (allSubWords.length < MIN_PUZZLE_WORDS) continue

    // Cap and balance the sub-word list
    const words = selectPuzzleWords(allSubWords)

    puzzles.push({
      id: id++,
      letters,
      mainWord,
      words,
    })
  }

  return puzzles
}

const puzzles = generatePuzzles(500)
const outPath = resolve(process.cwd(), 'src/data/puzzles.json')
writeFileSync(outPath, JSON.stringify(puzzles, null, 2))
console.log(`Generated ${puzzles.length} puzzles → ${outPath}`)
