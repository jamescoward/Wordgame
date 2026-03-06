import WordSlot from './WordSlot'
import '../styles/wordGrid.css'

interface WordGridProps {
  words: string[]
  foundWords: string[]
  revealedHints?: string[]   // words with first letter shown
  revealedWords?: string[]   // words fully revealed
}

export default function WordGrid({
  words,
  foundWords,
  revealedHints = [],
  revealedWords = [],
}: WordGridProps) {
  // Sort words by length, then alphabetically
  const sorted = [...words].sort((a, b) => a.length - b.length || a.localeCompare(b))

  const mid = Math.ceil(sorted.length / 2)
  const leftCol = sorted.slice(0, mid)
  const rightCol = sorted.slice(mid)

  const renderSlot = (word: string) => (
    <WordSlot
      key={word}
      word={word}
      found={foundWords.includes(word)}
      letterHinted={revealedHints.includes(word) && !revealedWords.includes(word)}
      fullyRevealed={revealedWords.includes(word)}
    />
  )

  return (
    <div className="word-grid" data-testid="word-grid">
      <div className="word-columns">
        <div className="word-column">{leftCol.map(renderSlot)}</div>
        <div className="word-column">{rightCol.map(renderSlot)}</div>
      </div>

    </div>
  )
}
