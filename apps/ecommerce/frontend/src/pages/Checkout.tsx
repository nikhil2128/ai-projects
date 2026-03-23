import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { api, ApiError } from "../api";
import type { Cart, PaymentMethod } from "../types";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "paypal", label: "PayPal" },
];

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit_card");

  useEffect(() => {
    api.cart
      .get()
      .then((c) => {
        if (c.items.length === 0) navigate("/cart");
        else setCart(c);
      })
      .catch(() => navigate("/cart"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const total =
    cart?.items.reduce((sum, i) => sum + i.price * i.quantity, 0) ?? 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shippingAddress.trim()) {
      setError("Shipping address is required");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const order = await api.orders.create(shippingAddress);
      await api.payments.process(order.id, paymentMethod);
      setSuccess(true);
      setTimeout(() => navigate("/orders"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Order Placed Successfully!
        </h2>
        <p className="text-gray-500">
          Redirecting to your orders...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Order Summary
          </h2>
          <div className="space-y-3">
            {cart?.items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.productName} x {item.quantity}
                </span>
                <span className="font-medium text-gray-900">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Shipping Address
          </h2>
          <textarea
            required
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            rows={3}
            placeholder="123 Main St, Springfield, IL 62701"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition resize-none"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Method
          </h2>
          <div className="space-y-3">
            {PAYMENT_METHODS.map((pm) => (
              <label
                key={pm.value}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                  paymentMethod === pm.value
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={pm.value}
                  checked={paymentMethod === pm.value}
                  onChange={() => setPaymentMethod(pm.value)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <CreditCard className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-gray-900">{pm.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition disabled:opacity-60 text-lg"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            `Pay $${total.toFixed(2)}`
          )}
        </button>
      </form>
    </div>
  );
}
