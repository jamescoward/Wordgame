import WordSlot from './WordSlot'
import '../styles/wordGrid.css'

interface WordGridProps {
  words: string[]
  foundWords: string[]
  bonusWords?: string[]
  revealedHints?: string[]   // words with first letter shown
  revealedWords?: string[]   // words fully revealed
}

export default function WordGrid({
  words,
  foundWords,
  bonusWords = [],
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

      {bonusWords.length > 0 && (
        <div className="bonus-words-section">
          <div className="bonus-words-label">Bonus Words</div>
          <div className="word-group">
            {bonusWords.map(word => (
              <WordSlot key={word} word={word} found={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
