import WordSlot from './WordSlot'
import '../styles/wordGrid.css'

interface WordGridProps {
  words: string[]
  foundWords: string[]
}

export default function WordGrid({ words, foundWords }: WordGridProps) {
  // Group words by length
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
        <div key={len} className="word-group">
          {byLength.get(len)!.map(word => (
            <WordSlot
              key={word}
              word={word}
              found={foundWords.includes(word)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
