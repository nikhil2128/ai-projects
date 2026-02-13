import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { ImageIcon, Eye, EyeOff } from 'lucide-react';
import type { UserRole } from '../types';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('FACTORY_WORKER');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isRegister) {
        result = await api.register(email, password, name, role, department || undefined);
      } else {
        result = await api.login(email, password);
      }
      login(result.token, result.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <ImageIcon className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AnnotateQC</h1>
          <p className="mt-1 text-sm text-gray-500">
            Collaborative image annotation for quality control
          </p>
        </div>

        {/* Form card */}
        <div className="card p-6">
          <h2 className="mb-6 text-center text-lg font-semibold text-gray-900">
            {isRegister ? 'Create an account' : 'Sign in to your account'}
          </h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Role
                    </label>
                    <select
                      className="input-field"
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                    >
                      <option value="FACTORY_WORKER">Factory Worker</option>
                      <option value="ENGINEER">Engineer</option>
                      <option value="PROCUREMENT">Procurement</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Department
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Assembly Line A"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder={isRegister ? 'Min. 8 characters' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isRegister ? 8 : undefined}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : isRegister ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              className="text-sm text-brand-600 hover:text-brand-700"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Register"}
            </button>
          </div>

          {/* Demo credentials hint */}
          {!isRegister && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
              <p className="font-medium text-gray-600 mb-1">Demo accounts (password: password123)</p>
              <p>worker@factory.com · engineer@factory.com · procurement@factory.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
