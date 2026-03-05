import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { WORD_LIST } from './wordlist.ts'
import type { Puzzle } from '../src/types.ts'

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
 * Main words are 6-8 letters; keep puzzles with 8-20 valid sub-words.
 */
function generatePuzzles(count: number): Puzzle[] {
  // Candidate main words: 6-8 letters
  const candidates = WORD_LIST
    .map(w => w.toUpperCase())
    .filter(w => w.length >= 6 && w.length <= 8)
    // Deduplicate
    .filter((w, i, arr) => arr.indexOf(w) === i)

  const puzzles: Puzzle[] = []
  let id = 1

  for (const mainWord of candidates) {
    if (puzzles.length >= count) break

    const letters = mainWord.split('')
    const subWords = findSubWords(letters)

    // Only keep puzzles where the main word itself is valid AND has 8-20 sub-words
    if (!ALL_WORDS.has(mainWord)) continue
    if (subWords.length < 8 || subWords.length > 20) continue

    puzzles.push({
      id: id++,
      letters,
      mainWord,
      words: subWords,
    })
  }

  return puzzles
}

const puzzles = generatePuzzles(500)
const outPath = resolve(process.cwd(), 'src/data/puzzles.json')
writeFileSync(outPath, JSON.stringify(puzzles, null, 2))
console.log(`Generated ${puzzles.length} puzzles → ${outPath}`)
