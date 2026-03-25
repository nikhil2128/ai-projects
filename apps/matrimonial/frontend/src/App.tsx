import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import BuildProfile from './pages/BuildProfile';
import Browse from './pages/Browse';
import MyProfile from './pages/MyProfile';
import ProfileDetail from './pages/ProfileDetail';
import FamilyProfile from './pages/FamilyProfile';
import SharedProfiles from './pages/SharedProfiles';
import ShortlistPage from './pages/Shortlist';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/browse" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/browse" replace /> : <Register />} />

      <Route path="/build-profile" element={
        <ProtectedRoute>
          <Layout><BuildProfile /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/browse" element={
        <ProtectedRoute>
          <Layout><Browse /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/my-profile" element={
        <ProtectedRoute>
          <Layout><MyProfile /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/family-profile" element={
        <ProtectedRoute>
          <Layout><FamilyProfile /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/shortlist" element={
        <ProtectedRoute>
          <Layout><ShortlistPage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/shared-profiles" element={
        <ProtectedRoute>
          <Layout><SharedProfiles /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/profile/:userId" element={
        <ProtectedRoute>
          <Layout><ProfileDetail /></Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to={user ? '/browse' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
