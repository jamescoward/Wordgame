import '../styles/wordGrid.css'

interface WordSlotProps {
  word: string
  found: boolean
  /** Word has had its first letter revealed (letter hint, costs 5 stars) */
  letterHinted?: boolean
  /** Word has been fully revealed (word reveal, costs 15 stars) */
  fullyRevealed?: boolean
}

export default function WordSlot({
  word,
  found,
  letterHinted = false,
  fullyRevealed = false,
}: WordSlotProps) {
  const showAll = found || fullyRevealed
  const className = [
    'word-slot',
    found ? 'found' : '',
    fullyRevealed && !found ? 'revealed' : '',
    letterHinted && !found && !fullyRevealed ? 'hinted' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      data-testid={`word-slot-${word}`}
      aria-label={showAll ? word : `${word.length}-letter word`}
    >
      {word.split('').map((letter, i) => {
        const showLetter = showAll || (letterHinted && i === 0)
        return (
          <span key={i} className="letter-box">
            {showLetter ? letter : ''}
          </span>
        )
      })}
    </div>
  )
}
