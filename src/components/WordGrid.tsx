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
  // Group puzzle words by length
  const byLength = new Map<number, string[]>()
  for (const word of words) {
    const group = byLength.get(word.length) ?? []
    group.push(word)
    byLength.set(word.length, group)
  }
  const lengths = [...byLength.keys()].sort((a, b) => a - b)

  return (
    <div className="word-grid" data-testid="word-grid">
      {lengths.map(len => (
        <div key={len} className={`word-group${len >= 6 ? ' word-group--single' : ''}`}>
          {byLength.get(len)!.map(word => (
            <WordSlot
              key={word}
              word={word}
              found={foundWords.includes(word)}
              letterHinted={revealedHints.includes(word) && !revealedWords.includes(word)}
              fullyRevealed={revealedWords.includes(word)}
            />
          ))}
        </div>
      ))}

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
