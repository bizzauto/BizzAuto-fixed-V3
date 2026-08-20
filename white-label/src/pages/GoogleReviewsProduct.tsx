import { Link } from "react-router-dom";
import { Check, ArrowRight, Star, ArrowLeft, Smartphone, QrCode, MessageSquare, Shield, Zap, BarChart } from "lucide-react";

const features = [
  { icon: <Star className="w-6 h-6" />, title: "AI-Powered Review QR Codes", desc: "Smart QR codes that take customers directly to your Google review page with AI-optimized prompts." },
  { icon: <MessageSquare className="w-6 h-6" />, title: "Smart Auto-Reply", desc: "AI automatically replies to reviews with contextual, personalized responses. Save hours of manual work." },
  { icon: <Shield className="w-6 h-6" />, title: "Negative Review Filter", desc: "Detect and redirect negative feedback before it goes public. Handle complaints privately." },
  { icon: <QrCode className="w-6 h-6" />, title: "NFC Card Integration", desc: "Physical NFC cards and digital QR codes that link to your review system. Tap or scan to review." },
  { icon: <BarChart className="w-6 h-6" />, title: "Analytics Dashboard", desc: "Track review trends, response times, rating changes, and customer sentiment over time." },
  { icon: <Zap className="w-6 h-6" />, title: "White-Label Branding", desc: "Everything works under your brand. Your logo, your domain, your colors, your pricing." },
];

export default function GoogleReviewsProduct() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">RP</span>
              </div>
              <span className="text-xl font-bold gradient-text">ResellerPro</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-300 hover:text-white text-sm">Login</Link>
              <Link to="/register" className="glow-btn-sm">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <Link to="/products" className="inline-flex items-center gap-1 text-gray-400 hover:text-white mb-8 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Products
          </Link>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mb-4">
                <Star className="w-3 h-3" /> Google Business Integration
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                AI Google Reviews <span className="gradient-text">QR System</span>
              </h1>
              <p className="text-lg text-gray-400 mb-6">
                Automate your Google review collection with AI-powered QR codes. Get more 5-star reviews,
                auto-reply to feedback, and filter negative reviews — all under your brand.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="glow-btn inline-flex items-center gap-2">
                  Start Selling <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#features" className="px-6 py-3 border border-white/10 rounded-xl text-gray-300 hover:text-white text-center">
                  View Features
                </a>
              </div>
            </div>

            {/* Preview */}
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="w-48 h-48 mx-auto mb-6 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                <div className="text-center">
                  <QrCode className="w-24 h-24 mx-auto text-amber-400 mb-2" />
                  <p className="text-sm text-gray-400">Scan to Review</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">Your Brand's Google Review QR Code</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-4 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Everything You Need</h2>
            <p className="text-gray-400">Powerful features to automate and grow your clients' online reputation</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 stagger">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Perfect For</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Restaurants & Cafes", desc: "Put QR codes on tables. Get instant reviews while customers wait for food." },
              { title: "Retail Stores", desc: "QR codes at checkout counters. Capture feedback at the moment of purchase." },
              { title: "Service Providers", desc: "Auto-send review requests after service completion. Doctors, salons, mechanics." },
            ].map((u, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 text-center stagger">
                <div className="text-3xl mb-3">{["🍽️", "🛍️", "🔧"][i]}</div>
                <h3 className="text-lg font-semibold mb-2">{u.title}</h3>
                <p className="text-gray-400 text-sm">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Reseller Pricing</h2>
          <p className="text-gray-400 mb-8">Sell this product at your own price. We charge you only ₹499/month.</p>
          <Link to="/register" className="glow-btn inline-flex items-center gap-2">
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
