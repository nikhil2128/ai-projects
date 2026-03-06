import type { AppConfig, AppRewards } from '../types';

interface AppCardProps {
  app: AppConfig;
  rewards: AppRewards;
  index: number;
  onClick: () => void;
}

export function AppCard({ app, rewards, index, onClick }: AppCardProps) {
  return (
    <button
      className="app-card"
      onClick={onClick}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="app-card-icon-wrap" style={{ background: app.gradient }}>
        <span className="app-card-icon">{app.icon}</span>
      </div>

      <div className="app-card-info">
        <h3 className="app-card-name">{app.name}</h3>
        <p className="app-card-desc">{app.description}</p>
      </div>

      <div className="app-card-rewards">
        {rewards.score > 0 && (
          <span className="app-card-badge">
            <span className="badge-icon">⭐</span>
            <span className="badge-value">{rewards.score}</span>
          </span>
        )}
        {rewards.streak >= 3 && (
          <span className="app-card-badge badge-streak">
            <span className="badge-icon">🔥</span>
            <span className="badge-value">{rewards.streak}</span>
          </span>
        )}
        {rewards.highScore > 0 && (
          <span className="app-card-badge badge-high">
            <span className="badge-icon">🏆</span>
            <span className="badge-value">{rewards.highScore}</span>
          </span>
        )}
      </div>

      <div className="app-card-play">
        <span className="play-text">Play!</span>
        <span className="play-arrow">→</span>
      </div>
    </button>
  );
}
