import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import SellerLayout from "./components/SellerLayout";
import ErrorBoundary from "./components/ErrorBoundary";

const Home = lazy(() => import("./pages/Home"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Orders = lazy(() => import("./pages/Orders"));
const Favorites = lazy(() => import("./pages/Favorites"));

const SellerDashboard = lazy(() => import("./pages/seller/Dashboard"));
const SellerProducts = lazy(() => import("./pages/seller/Products"));
const AddProduct = lazy(() => import("./pages/seller/AddProduct"));
const BatchUpload = lazy(() => import("./pages/seller/BatchUpload"));
const SellerSales = lazy(() => import("./pages/seller/Sales"));

function PageLoader() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

function SellerRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isSeller } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isSeller) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function SellerPage({ children }: { children: React.ReactNode }) {
  return (
    <SellerRoute>
      <SellerLayout>{children}</SellerLayout>
    </SellerRoute>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Seller Portal */}
          <Route
            path="/seller"
            element={<SellerPage><SellerDashboard /></SellerPage>}
          />
          <Route
            path="/seller/products"
            element={<SellerPage><SellerProducts /></SellerPage>}
          />
          <Route
            path="/seller/products/new"
            element={<SellerPage><AddProduct /></SellerPage>}
          />
          <Route
            path="/seller/products/batch"
            element={<SellerPage><BatchUpload /></SellerPage>}
          />
          <Route
            path="/seller/sales"
            element={<SellerPage><SellerSales /></SellerPage>}
          />

          {/* Buyer Store */}
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/products/:id" element={<Layout><ProductDetail /></Layout>} />
          <Route path="/login" element={<Layout><Login /></Layout>} />
          <Route path="/register" element={<Layout><Register /></Layout>} />
          <Route
            path="/favorites"
            element={
              <Layout>
                <ProtectedRoute>
                  <Favorites />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/cart"
            element={
              <Layout>
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/checkout"
            element={
              <Layout>
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/orders"
            element={
              <Layout>
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
