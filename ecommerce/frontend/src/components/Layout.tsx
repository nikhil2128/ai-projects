import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Package, LogOut, LogIn, Store } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useQuery, invalidateQuery } from "../hooks/useQuery";
import { api } from "../api";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, email, logout } = useAuth();
  const navigate = useNavigate();

  const { data: cart } = useQuery(
    "cart:layout",
    () => api.cart.get(),
    { enabled: isLoggedIn, staleTime: 10_000 }
  );

  const cartCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  const handleLogout = () => {
    invalidateQuery("cart:");
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700">
              <Store className="h-7 w-7" />
              <span className="text-xl font-bold">ShopHub</span>
            </Link>

            <nav className="flex items-center gap-2">
              {isLoggedIn ? (
                <>
                  <span className="hidden sm:block text-sm text-gray-500 mr-2">
                    {email}
                  </span>
                  <Link
                    to="/cart"
                    className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-indigo-600 transition"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {cartCount > 9 ? "9+" : cartCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/orders"
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-indigo-600 transition"
                  >
                    <Package className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-red-600 transition"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-400">
          ShopHub &mdash; Demo E-Commerce Application
        </div>
      </footer>
    </div>
  );
}
