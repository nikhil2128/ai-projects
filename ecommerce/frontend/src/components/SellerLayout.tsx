import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  LogOut,
  Store,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/seller", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/seller/products", icon: Package, label: "Products", exact: false },
  { to: "/seller/sales", icon: TrendingUp, label: "Sales", exact: false },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { email, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  function isActive(to: string, exact: boolean) {
    return exact ? location.pathname === to : location.pathname.startsWith(to);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/seller"
              className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
            >
              <Store className="h-7 w-7" />
              <span className="text-xl font-bold">ShopHub</span>
              <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                Seller
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                View Store <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-sm text-gray-400 hidden sm:block">{email}</span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-red-600 transition"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200 py-6">
          <nav className="flex-1 px-4 space-y-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => {
              const active = isActive(to, exact);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-emerald-600" : "text-gray-400"}`} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-2 flex justify-around">
          {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium ${
                  active ? "text-emerald-600" : "text-gray-400"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-6 sm:p-8 pb-24 md:pb-8 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  );
}
