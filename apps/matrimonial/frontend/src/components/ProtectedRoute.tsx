import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './shared';

interface Props {
  children: React.ReactNode;
  requireProfile?: boolean;
}

export default function ProtectedRoute({ children, requireProfile = false }: Props) {
  const { user, hasProfile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner size="lg" fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireProfile && !hasProfile) {
    return <Navigate to="/build-profile" replace />;
  }

  return <>{children}</>;
}
