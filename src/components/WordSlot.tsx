import '../styles/wordGrid.css'

interface WordSlotProps {
  word: string
  found: boolean
  revealed?: boolean  // fully revealed by hint (shown but not "found")
}

export default function WordSlot({ word, found, revealed = false }: WordSlotProps) {
  const showLetters = found || revealed
  const className = `word-slot${found ? ' found' : ''}${revealed && !found ? ' hinted' : ''}`

  return (
    <div
      className={className}
      data-testid={`word-slot-${word}`}
      aria-label={showLetters ? word : `${word.length}-letter word`}
    >
      {word.split('').map((letter, i) => (
        <span key={i} className="letter-box">
          {showLetters ? letter : ''}
        </span>
      ))}
    </div>
  )
}
