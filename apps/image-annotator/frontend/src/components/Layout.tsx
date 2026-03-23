import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut,
  ImageIcon,
  User as UserIcon,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  ENGINEER: 'Engineer',
  PROCUREMENT: 'Procurement',
  FACTORY_WORKER: 'Factory Worker',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ImageIcon className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-gray-900">AnnotateQC</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">
                  {user?.role ? ROLE_LABELS[user.role] || user.role : ''}
                  {user?.department ? ` · ${user.department}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
