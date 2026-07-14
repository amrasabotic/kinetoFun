import type { PlacedWord } from '../types';

interface WordListProps {
  words: PlacedWord[];
}

export function WordList({ words }: WordListProps) {
  return (
    <div className="wsh-word-list">
      <h2 className="wsh-word-list__title">Find these words</h2>
      <ul>
        {words.map((w) => (
          <li key={w.word} className={w.found ? 'wsh-word-list__item wsh-word-list__item--found' : 'wsh-word-list__item'}>
            {w.word}
          </li>
        ))}
      </ul>
    </div>
  );
}
