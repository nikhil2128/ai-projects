interface ScoreBoardProps {
  score: number;
  streak: number;
}

export function ScoreBoard({ score, streak }: ScoreBoardProps) {
  return (
    <div className="scoreboard">
      <div className="score-item">
        <span className="score-icon">⭐</span>
        <span className="score-value">{score}</span>
      </div>
      {streak >= 3 && (
        <div className="score-item streak-badge">
          <span className="score-icon">🔥</span>
          <span className="score-value">{streak}</span>
        </div>
      )}
    </div>
  );
}
