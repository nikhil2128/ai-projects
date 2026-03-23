import { useParams, useNavigate } from 'react-router-dom';
import { getAppById } from '../apps/registry';

export function AppPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const app = appId ? getAppById(appId) : undefined;

  if (!app) {
    return (
      <div className="app-not-found">
        <h2>App not found</h2>
        <button className="btn-back-home" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    );
  }

  const AppComponent = app.component;

  return (
    <div className="app-page">
      <div className="app-page-nav">
        <button className="btn-home" onClick={() => navigate('/')}>
          <span className="btn-home-icon">🏠</span>
          <span className="btn-home-text">Home</span>
        </button>
      </div>

      <AppComponent />

      <div className="floating-shapes">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`shape shape-${i + 1}`} />
        ))}
      </div>
    </div>
  );
}
