import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api";
import type { UserRole } from "../types";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("buyer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(email, name, password, role);
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <UserPlus className="h-10 w-10 text-indigo-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 mt-1">Join ShopHub today</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I want to
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                  role === "buyer"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                Buy Products
              </button>
              <button
                type="button"
                onClick={() => setRole("seller")}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                  role === "seller"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                Sell Products
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {role === "seller" ? "Business Name" : "Full Name"}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              placeholder={role === "seller" ? "Your Store Name" : "Alice Johnson"}
            />
          </div>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              placeholder="Min. 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-3 text-white font-medium rounded-xl transition disabled:opacity-60 ${
              role === "seller"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : role === "seller" ? (
              "Create Seller Account"
            ) : (
              "Create Account"
            )}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
