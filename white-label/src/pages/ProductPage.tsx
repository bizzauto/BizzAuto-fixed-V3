import { Link } from "react-router-dom";
import { PRODUCTS } from "../lib/store";
import { ArrowRight, Star, CreditCard, Globe, Check } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Star: <Star className="w-8 h-8" />,
  CreditCard: <CreditCard className="w-8 h-8" />,
  Globe: <Globe className="w-8 h-8" />,
};

export default function ProductPage() {
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

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Our White-Label Products</h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Each product is fully white-labeled. Sell them under your own brand with your own pricing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PRODUCTS.map((product) => (
              <div key={product.id} className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6" style={{ background: `linear-gradient(135deg, ${product.color}15, transparent)` }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${product.color}25`, color: product.color }}>
                      {iconMap[product.icon]}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                      <p className="text-sm text-gray-400">{product.price}</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{product.description}</p>
                  <ul className="space-y-2 mb-6">
                    {product.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: product.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/products/${product.id}`}
                    className="block text-center py-3 rounded-xl font-semibold transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${product.color}, transparent)`,
                      border: `1px solid ${product.color}40`,
                      color: 'white',
                    }}
                  >
                    Learn More <ArrowRight className="w-4 h-4 inline" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
