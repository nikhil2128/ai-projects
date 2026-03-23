import { useNavigate } from 'react-router-dom';
import { apps } from '../apps/registry';
import { AppCard } from '../components/AppCard';
import { useRewards } from '../context/RewardsContext';

export function Hub() {
  const navigate = useNavigate();
  const { getRewards, getAllRewards } = useRewards();
  const allRewards = getAllRewards();

  const totalStars = Object.values(allRewards).reduce((sum, r) => sum + r.score, 0);

  return (
    <div className="hub">
      <header className="hub-header">
        <div className="hub-title-section">
          <h1 className="hub-title">
            <span className="hub-letter" style={{ color: '#FF6B6B' }}>K</span>
            <span className="hub-letter" style={{ color: '#FFD93D' }}>i</span>
            <span className="hub-letter" style={{ color: '#4ECDC4' }}>d</span>
            <span className="hub-letter" style={{ color: '#9B59B6' }}>s</span>
            <span className="hub-space"> </span>
            <span className="hub-word">Learning Hub</span>
          </h1>
          <p className="hub-subtitle">Pick an activity and start learning!</p>
        </div>

        {totalStars > 0 && (
          <div className="hub-total-stars">
            <span className="hub-stars-icon">⭐</span>
            <span className="hub-stars-count">{totalStars}</span>
            <span className="hub-stars-label">Total Stars</span>
          </div>
        )}
      </header>

      <main className="hub-grid">
        {apps.map((app, i) => (
          <AppCard
            key={app.id}
            app={app}
            rewards={getRewards(app.id)}
            index={i}
            onClick={() => navigate(`/app/${app.id}`)}
          />
        ))}
      </main>

      <div className="floating-shapes">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`shape shape-${i + 1}`} />
        ))}
      </div>
    </div>
  );
}
