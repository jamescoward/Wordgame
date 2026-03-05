import '../styles/wordGrid.css'

interface WordSlotProps {
  word: string
  found: boolean
  revealed?: boolean  // partially revealed by hint
}

export default function WordSlot({ word, found }: WordSlotProps) {
  return (
    <div
      className={`word-slot${found ? ' found' : ''}`}
      data-testid={`word-slot-${word}`}
      aria-label={found ? word : `${word.length}-letter word`}
    >
      {word.split('').map((letter, i) => (
        <span key={i} className="letter-box">
          {found ? letter : ''}
        </span>
      ))}
    </div>
  )
}
