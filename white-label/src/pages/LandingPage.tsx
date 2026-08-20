import { Link } from "react-router-dom";
import { useWhiteLabelStore, PRODUCTS } from "../lib/store";
import {
  ArrowRight, Star, CreditCard, Globe, Check,
  Menu, X, Shield, Zap, Users, Rocket, TrendingUp, DollarSign,
} from "lucide-react";
import { useState } from "react";

const iconMap: Record<string, React.ReactNode> = {
  Star: <Star className="w-8 h-8" />,
  CreditCard: <CreditCard className="w-8 h-8" />,
  Globe: <Globe className="w-8 h-8" />,
};

const stats = [
  { icon: <Users className="w-5 h-5" />, value: "500+", label: "Active Resellers" },
  { icon: <Shield className="w-5 h-5" />, value: "99.9%", label: "Uptime Guarantee" },
  { icon: <Rocket className="w-5 h-5" />, value: "24/7", label: "Support" },
  { icon: <TrendingUp className="w-5 h-5" />, value: "3x", label: "Avg Revenue Growth" },
];

const steps = [
  { step: "01", title: "Choose Your Products", desc: "Select from our white-label SaaS products that fit your market." },
  { step: "02", title: "Brand It Your Way", desc: "Customize with your logo, domain, colors, and pricing." },
  { step: "03", title: "Sell to Your Clients", desc: "Start selling to your clients and keep 100% of the revenue." },
  { step: "04", title: "We Handle Tech", desc: "We manage hosting, updates, and support while you grow." },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthenticated = useWhiteLabelStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen">
      {/* ==================== NAVBAR ==================== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">RP</span>
              </div>
              <span className="text-xl font-bold gradient-text">ResellerPro</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/products" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Products</Link>
              <a href="#features" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Pricing</a>
              <a href="#faq" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">FAQ</a>
              {isAuthenticated ? (
                <Link to="/dashboard" className="glow-btn-sm px-6 py-2">Dashboard</Link>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Login</Link>
                  <Link to="/register" className="glow-btn-sm">Get Started</Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#0a0a1a]/95 backdrop-blur-xl border-t border-white/5">
            <div className="px-4 py-4 space-y-3">
              <Link to="/products" className="block text-gray-300 py-2" onClick={() => setMenuOpen(false)}>Products</Link>
              <a href="#features" className="block text-gray-300 py-2" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#pricing" className="block text-gray-300 py-2" onClick={() => setMenuOpen(false)}>Pricing</a>
              <a href="#faq" className="block text-gray-300 py-2" onClick={() => setMenuOpen(false)}>FAQ</a>
              {isAuthenticated ? (
                <Link to="/dashboard" className="block glow-btn-sm text-center" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Link to="/login" className="flex-1 text-center py-2 border border-white/10 rounded-lg text-gray-300" onClick={() => setMenuOpen(false)}>Login</Link>
                  <Link to="/register" className="flex-1 text-center glow-btn-sm" onClick={() => setMenuOpen(false)}>Get Started</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ==================== HERO SECTION ==================== */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-8 animate-fade-up">
            <Zap className="w-4 h-4" />
            White-Label SaaS Reseller Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-fade-up">
            Launch Your Own
            <br />
            <span className="gradient-text">Software Business</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-fade-up">
            Start your own SaaS business today. Sell white-label software products under your own brand,
            set your own pricing, and keep 100% of the profit. No coding required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up">
            <Link to="/register" className="glow-btn text-lg px-8 py-4 inline-flex items-center gap-2">
              Start Your Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/products" className="px-8 py-4 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:border-white/20 transition-all inline-flex items-center gap-2">
              View Products <Globe className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Animated floating elements */}
        <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-indigo-500/10 animate-float" />
        <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-pink-500/10 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 right-20 w-16 h-16 rounded-full bg-teal-500/10 animate-float" style={{ animationDelay: "2s" }} />
      </section>

      {/* ==================== STATS ==================== */}
      <section className="py-12 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <div key={i} className="text-center stagger">
                <div className="flex justify-center mb-2 text-indigo-400">{s.icon}</div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-sm text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRODUCTS OVERVIEW ==================== */}
      <section id="products" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Our White-Label Products</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Choose from our suite of high-demand SaaS products. Each comes fully white-labeled with your brand.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PRODUCTS.map((product, i) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="glass-card rounded-2xl p-6 group stagger"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${product.color}20`, color: product.color }}
                >
                  {iconMap[product.icon]}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-indigo-300 transition-colors">
                  {product.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4">{product.tagline}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold gradient-text">{product.price}</span>
                  <span className="text-indigo-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 text-sm">
                    Learn More <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="features" className="py-20 px-4 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Start your white-label SaaS business in 4 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 stagger">
                <div className="text-4xl font-bold gradient-text mb-2">{s.step}</div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURES GRID ==================== */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose ResellerPro?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Everything you need to run a successful SaaS reselling business
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <DollarSign className="w-6 h-6" />, title: "Keep 100% Revenue", desc: "Set your own prices and keep every rupee your clients pay you. No revenue sharing." },
              { icon: <Shield className="w-6 h-6" />, title: "Your Brand, Your Domain", desc: "Full white-label with custom domain, logo, colors. Your clients see your brand only." },
              { icon: <Zap className="w-6 h-6" />, title: "Instant Deployment", desc: "Get your reseller portal setup in under 24 hours. Start selling immediately." },
              { icon: <Users className="w-6 h-6" />, title: "Client Management", desc: "Powerful dashboard to manage all your clients, subscriptions, and billing." },
              { icon: <Rocket className="w-6 h-6" />, title: "No Tech Skills Needed", desc: "We handle hosting, updates, and infrastructure. You focus on selling." },
              { icon: <TrendingUp className="w-6 h-6" />, title: "24/7 Support", desc: "Dedicated support team to help you and your clients anytime." },
            ].map((f, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 stagger">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRICING ==================== */}
      <section id="pricing" className="py-20 px-4 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Reseller Plans</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Start small and scale up as your business grows
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Starter", price: "₹999", period: "/mo", desc: "Perfect for freelancers",
                features: ["1 White-label product", "Up to 10 clients", "Custom domain", "Basic support"],
                popular: false,
              },
              {
                name: "Professional", price: "₹2,499", period: "/mo", desc: "Best for growing agencies",
                features: ["All 3 products", "Up to 50 clients", "Custom domain + branding", "Priority support", "API access"],
                popular: true,
              },
              {
                name: "Enterprise", price: "₹9,999", period: "/mo", desc: "For large agencies",
                features: ["All products unlimited", "Unlimited clients", "Multiple custom domains", "White-label mobile apps", "Dedicated account manager", "SLA guarantee"],
                popular: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`glass-card rounded-2xl p-8 relative stagger ${plan.popular ? "border-indigo-500/50" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-xs font-semibold">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className={`block text-center py-3 rounded-xl font-semibold transition-all ${
                  plan.popular ? "glow-btn" : "border border-white/10 text-gray-300 hover:border-white/20"
                }`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Do I need technical skills to start?", a: "No! We handle all the technical aspects - hosting, updates, infrastructure. You just need to sell." },
              { q: "How fast can I start selling?", a: "Your reseller portal is ready within 24 hours of signup. You can start selling immediately." },
              { q: "Can I use my own domain?", a: "Yes! You get a custom subdomain, and you can also use your own custom domain." },
              { q: "How do I get paid by my clients?", a: "You set up your own payment gateway (Razorpay/Stripe) and keep 100% of what you charge." },
              { q: "What support do you provide?", a: "24/7 technical support. We handle all server and software issues so you don't have to." },
            ].map((faq, i) => (
              <details key={i} className="glass-card rounded-xl group">
                <summary className="p-4 cursor-pointer font-medium text-white flex items-center justify-between">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-gray-400 text-sm">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto glass-card rounded-3xl p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Start Your SaaS Business?</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Join 500+ resellers who are already building profitable software businesses with ResellerPro.
          </p>
          <Link to="/register" className="glow-btn text-lg px-10 py-4 inline-flex items-center gap-2">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">RP</span>
            </div>
            <span className="font-semibold">ResellerPro</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link to="/products" className="hover:text-white transition-colors">Products</Link>
            <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms</a>
          </div>
          <p className="text-sm text-gray-500">© 2026 ResellerPro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
