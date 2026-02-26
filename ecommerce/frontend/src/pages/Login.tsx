import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      const role = localStorage.getItem("role");
      navigate(role === "seller" ? "/seller" : "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <LogIn className="h-10 w-10 text-indigo-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5"
        >
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
