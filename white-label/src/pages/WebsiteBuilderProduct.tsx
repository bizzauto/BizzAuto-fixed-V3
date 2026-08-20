import { Link } from "react-router-dom";
import { Check, ArrowRight, ArrowLeft, Globe, Palette, Smartphone, Search, Code, Image, Zap, Shield } from "lucide-react";

const features = [
  { icon: <Globe className="w-6 h-6" />, title: "No-Code Builder", desc: "Drag-and-drop interface. Build beautiful websites without any coding knowledge." },
  { icon: <Smartphone className="w-6 h-6" />, title: "Mobile-First Design", desc: "All templates are fully responsive. Perfect display on phones, tablets, and desktops." },
  { icon: <Palette className="w-6 h-6" />, title: "20+ Templates", desc: "Industry-specific templates for restaurants, salons, clinics, real estate, and more." },
  { icon: <Search className="w-6 h-6" />, title: "SEO Optimized", desc: "Built-in SEO tools. Meta tags, sitemaps, and schema markup for better Google rankings." },
  { icon: <Image className="w-6 h-6" />, title: "Media Integration", desc: "Add images, videos, Google Maps, contact forms, WhatsApp chat, and social links." },
  { icon: <Zap className="w-6 h-6" />, title: "Custom Domain", desc: "Connect your own domain or use a free subdomain. SSL included." },
];

export default function WebsiteBuilderProduct() {
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs mb-4">
                <Globe className="w-3 h-3" /> No-Code Website Builder
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                Single Page <span className="gradient-text">Website Builder</span>
              </h1>
              <p className="text-lg text-gray-400 mb-6">
                Help your clients build beautiful single-page websites in minutes. No coding required.
                Drag-and-drop builder with 20+ professional templates.
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
              <div className="w-48 h-48 mx-auto mb-6 bg-gradient-to-br from-teal-500/20 to-emerald-600/10 rounded-2xl flex items-center justify-center border border-teal-500/20">
                <div className="text-center">
                  <Globe className="w-24 h-24 mx-auto text-teal-400 mb-2" />
                  <p className="text-sm text-gray-400">Your Brand's Website Builder</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">20+ Templates • No-Code • Custom Domain</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-4 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Build Websites in Minutes</h2>
            <p className="text-gray-400">Everything your clients need for a professional online presence</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 stagger">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Perfect For These Industries</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: "🍕", name: "Restaurants" },
              { emoji: "💇", name: "Salons & Spas" },
              { emoji: "🏥", name: "Clinics" },
              { emoji: "🏠", name: "Real Estate" },
              { emoji: "🔧", name: "Contractors" },
              { emoji: "📸", name: "Photographers" },
              { emoji: "👨‍⚖️", name: "Lawyers" },
              { emoji: "🏋️", name: "Fitness Trainers" },
            ].map((ind, i) => (
              <div key={i} className="glass-card rounded-xl p-4 text-center stagger">
                <div className="text-2xl mb-1">{ind.emoji}</div>
                <p className="text-sm text-gray-300">{ind.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Reseller Pricing</h2>
          <p className="text-gray-400 mb-8">Sell this product at your own price. We charge you only ₹599/month.</p>
          <Link to="/register" className="glow-btn inline-flex items-center gap-2">
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
