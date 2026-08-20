import { Link } from "react-router-dom";
import { Check, ArrowRight, ArrowLeft, CreditCard, Smartphone, Image, Palette, Share2, Layout, Shield } from "lucide-react";

const features = [
  { icon: <Layout className="w-6 h-6" />, title: "30+ Premium Templates", desc: "Professionally designed templates for every industry. Customize colors, fonts, and layout." },
  { icon: <Smartphone className="w-6 h-6" />, title: "NFC Technology", desc: "Tap physical NFC cards to instantly share digital v-cards. Works with all modern smartphones." },
  { icon: <Image className="w-6 h-6" />, title: "Media Galleries", desc: "Showcase products, services, and portfolio with image and video galleries." },
  { icon: <Share2 className="w-6 h-6" />, title: "Social Media Links", desc: "All social media profiles in one place. WhatsApp, Instagram, LinkedIn, Facebook, YouTube." },
  { icon: <Palette className="w-6 h-6" />, title: "Full Customization", desc: "Edit your v-card anytime. Change colors, update info, add new services." },
  { icon: <Shield className="w-6 h-6" />, title: "100% White-Label", desc: "Your brand, your domain, your logo. No ResellerPro branding anywhere." },
];

export default function VCardProduct() {
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs mb-4">
                <CreditCard className="w-3 h-3" /> Digital Business Cards
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                Digital <span className="gradient-text">V-Card</span> Maker
              </h1>
              <p className="text-lg text-gray-400 mb-6">
                Create stunning digital business cards with NFC support. 30+ templates, media galleries,
                and full white-label customization — all under your brand.
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
              <div className="w-48 h-48 mx-auto mb-6 bg-gradient-to-br from-indigo-500/20 to-purple-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                <div className="text-center">
                  <CreditCard className="w-24 h-24 mx-auto text-indigo-400 mb-2" />
                  <p className="text-sm text-gray-400">Digital Business Card</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">30+ Templates • NFC Ready • Your Brand</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-4 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Powerful Digital Card Features</h2>
            <p className="text-gray-400">Everything you need to offer premium digital business cards</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 stagger">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Preview */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">30+ Premium Templates</h2>
          <p className="text-gray-400 mb-8">Professional designs for every industry and profession</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {["Corporate", "Creative", "Minimal", "Bold", "Elegant", "Modern", "Classic", "Vibrant", "Dark", "Nature"].map((t, i) => (
              <div key={i} className="glass-card rounded-xl p-4 text-center stagger">
                <div className="w-full h-20 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 mb-2 flex items-center justify-center border border-white/5">
                  <CreditCard className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-xs text-gray-400">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Reseller Pricing</h2>
          <p className="text-gray-400 mb-8">Sell this product at your own price. We charge you only ₹399/month.</p>
          <Link to="/register" className="glow-btn inline-flex items-center gap-2">
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
