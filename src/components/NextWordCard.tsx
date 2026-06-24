interface Props {
  currentWord: string;
  nextWord: string;
}

export default function NextWordCard({ currentWord, nextWord }: Props) {
  return (
    <div className="next-word-area">
      <div className="current-word-card">
        <span className="nw-label">つぎのことば</span>
        <span className="nw-word">{currentWord}</span>
      </div>
      <div className="after-word-card">
        <span className="nw-label-sm">そのつぎ</span>
        <span className="nw-word-sm">{nextWord}</span>
      </div>
    </div>
  );
}
