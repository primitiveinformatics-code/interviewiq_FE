"use client";
import { useEffect, useState } from "react";
import { getBillingStatus, createOrder, verifyPayment, redeemCoupon, getContactInfo } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { CONTACT } from "@/lib/contact";
import Script from "next/script";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

const PACKS = [
  {
    credits: 1 as const,
    label: "1 Interview",
    originalPrice: "₹700",
    price: "₹140",
    desc: "Perfect for one focused practice session.",
  },
  {
    credits: 5 as const,
    label: "5 Interviews",
    originalPrice: "₹2,990",
    price: "₹598",
    desc: "Save more — great for active job searchers.",
    popular: true,
  },
  {
    credits: 10 as const,
    label: "10 Interviews",
    originalPrice: "₹4,990",
    price: "₹998",
    desc: "Best value for serious prep.",
  },
];

export default function PricingPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [trialUsed, setTrialUsed] = useState(false);
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCreditCheat, setShowCreditCheat] = useState(false);
  const [contactEmail, setContactEmail] = useState(CONTACT.email);

  useEffect(() => {
    if (isLoggedIn()) {
      getBillingStatus().then((s) => {
        setCredits(s.interview_credits);
        setTrialUsed(s.trial_used);
      });
    }
    getContactInfo()
      .then((info) => setContactEmail(info.email))
      .catch(() => {/* keep fallback */});
  }, []);

  async function handleRedeemCoupon() {
    if (!isLoggedIn()) { window.location.href = "/login"; return; }
    const code = couponCode.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const result = await redeemCoupon(code);
      setCredits(result.interview_credits);
      setCouponCode("");
      setCouponMsg({ type: "success", text: result.message });
    } catch (e: unknown) {
      setCouponMsg({ type: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleBuy(c: 1 | 5 | 10) {
    if (!isLoggedIn()) { window.location.href = "/login"; return; }
    setLoading(c);
    setError("");
    try {
      const order = await createOrder(c);

      const rzp = new window.Razorpay({
        key:         order.key_id,
        amount:      order.amount,
        currency:    order.currency,
        name:        order.name,
        description: order.description,
        order_id:    order.order_id,
        prefill: {
          email: order.prefill_email,
        },
        theme: { color: "#4F46E5" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const result = await verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              credits: c,
            });
            setCredits(result.interview_credits);
            alert(`Payment successful! ${result.credits_added} credit${result.credits_added > 1 ? "s" : ""} added.`);
          } catch {
            setError("Payment received but verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: () => setLoading(null),
        },
      });
      rzp.open();
    } catch (e) {
      setError(String(e));
      setLoading(null);
    }
  }

  return (
    <>
      {/* Razorpay JS checkout SDK */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Title row with Credit Cheat button */}
        <div className="flex items-center justify-center gap-4 mb-2 flex-wrap">
          <h1 className="text-4xl font-bold text-center">Simple, Credit-Based Pricing</h1>
          <button
            onClick={() => setShowCreditCheat(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-sm font-bold px-4 py-2 rounded-full shadow-md hover:from-yellow-500 hover:to-orange-500 transition animate-pulse"
          >
            <span>🎁</span> Credit Cheat
          </button>
        </div>

        {/* Launch discount badge */}
        <div className="flex justify-center mb-3">
          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-300">
            🚀 Launch Offer — 80% OFF for the first few days!
          </span>
        </div>

        <p className="text-center text-gray-500 mb-4">
          1 credit = 1 full interview (15–20 questions, up to 1 hour).
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center mb-6 text-red-700">
            {error}
          </div>
        )}

        {!trialUsed && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center mb-8 text-indigo-700 font-medium">
            You have 1 free trial interview — 3 questions to experience the platform. No payment needed.
          </div>
        )}
        {credits !== null && credits > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-8 text-green-700 font-medium">
            You have {credits} interview credit{credits !== 1 ? "s" : ""} remaining.
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {PACKS.map((pack) => (
            <div
              key={pack.credits}
              className={`bg-white rounded-2xl border p-6 flex flex-col ${
                pack.popular ? "border-indigo-500 shadow-lg ring-2 ring-indigo-500" : "border-gray-200 shadow-sm"
              }`}
            >
              {pack.popular && (
                <span className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full self-start mb-3 font-semibold">
                  Most Popular
                </span>
              )}
              {/* 80% OFF badge */}
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full self-start mb-2 font-bold">
                80% OFF
              </span>
              <h2 className="text-xl font-bold mb-1">{pack.label}</h2>
              {/* Strikethrough original price */}
              <p className="text-sm text-gray-400 line-through mb-0.5">{pack.originalPrice}</p>
              {/* Discounted price */}
              <p className="text-3xl font-bold text-indigo-600 mb-2">{pack.price}</p>
              <p className="text-gray-500 text-sm mb-6 flex-1">{pack.desc}</p>
              <button
                onClick={() => handleBuy(pack.credits)}
                disabled={loading !== null}
                className="bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading === pack.credits ? "Opening..." : "Buy Now"}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          Secure payments via Razorpay. Credits never expire.
        </p>

        {/* ── Coupon code section ─────────────────────────────────────── */}
        <div className="mt-12 border-t border-gray-200 pt-10">
          <h2 className="text-xl font-semibold text-center mb-2">Have a coupon code?</h2>
          <p className="text-center text-gray-500 text-sm mb-6">
            Enter your code below to instantly add interview credits to your account.
          </p>

          {couponMsg && (
            <div className={`rounded-lg p-3 text-center text-sm mb-4 ${
              couponMsg.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {couponMsg.text}
            </div>
          )}

          <div className="flex max-w-md mx-auto gap-3">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleRedeemCoupon()}
              placeholder="e.g. BETA2024"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={handleRedeemCoupon}
              disabled={couponLoading || !couponCode.trim()}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {couponLoading ? "Applying..." : "Apply"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Credit Cheat modal ──────────────────────────────────────────── */}
      {showCreditCheat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowCreditCheat(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCreditCheat(false)}
              className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
            <div className="text-center mb-4">
              <span className="text-4xl">🎁</span>
              <h2 className="text-xl font-bold text-gray-800 mt-2">Get 2 Free Credits!</h2>
            </div>
            <ol className="text-sm text-gray-600 space-y-3 list-decimal list-inside">
              <li>
                Subscribe to our YouTube channel:{" "}
                <a
                  href="http://www.youtube.com/@primitive_architect"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 font-semibold hover:underline break-all"
                >
                  youtube.com/@primitive_architect
                </a>
              </li>
              <li>
                Take a screenshot of your subscription.
              </li>
              <li>
                Send it to the{" "}
                <a
                  href={`mailto:${contactEmail}?subject=Subscribed%20and%20requesting%20credit`}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  contact email ID
                </a>{" "}
                with subject:{" "}
                <span className="font-mono bg-gray-100 px-1 rounded text-xs">
                  Subscribed and requesting credit
                </span>
              </li>
            </ol>
            <p className="text-xs text-gray-400 mt-4 text-center italic">
              You will receive 2 free interview credits after verification.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
