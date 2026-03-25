import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Search, User, LogOut, Sparkles, Menu, X, Users, Share2, Bookmark } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/browse', label: 'Browse', icon: <Search className="w-5 h-5" /> },
    { path: '/shortlist', label: 'Shortlist', icon: <Bookmark className="w-5 h-5" /> },
    { path: '/my-profile', label: 'My Profile', icon: <User className="w-5 h-5" /> },
    { path: '/family-profile', label: 'Family', icon: <Users className="w-5 h-5" /> },
    { path: '/shared-profiles', label: 'Shared', icon: <Share2 className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      <nav className="sticky top-0 z-50 glass border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/browse" className="flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary-500" />
              <span className="font-display text-xl font-bold text-gradient">SoulMatch</span>
            </Link>

            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive(link.path)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-3">
              {profile?.firstName && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                    {profile.photoUrl ? (
                      <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      profile.firstName[0]
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{profile.firstName}</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 px-3 py-2 rounded-xl text-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="sm:hidden text-gray-600">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white/95 backdrop-blur-lg">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(link.path)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 w-full"
              >
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      <main>{children}</main>

      <footer className="border-t border-gray-100 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-primary-500 fill-primary-500" />
            <span className="text-sm font-medium text-gray-600">SoulMatch</span>
          </div>
          <p className="text-xs text-gray-400">Find your perfect match. Made with love.</p>
        </div>
      </footer>
    </div>
  );
}
