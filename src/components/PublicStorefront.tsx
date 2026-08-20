import React, { useState, useEffect, useCallback } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, X, Tag, ChevronRight, Package, Star, Filter, Heart, ArrowUpDown, ChevronDown, ZoomIn, ZoomOut, RotateCcw, Share2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../lib/api';
import { useToast } from './Toast';

interface Product {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  quantity: number;
  images: string[];
  mainImage?: string;
  description?: string;
  status: string;
  variants?: { id: string; name: string; options: any; price?: number; quantity: number }[];
}

interface CartItem {
  id?: string;
  product: Product;
  quantity: number;
  variant?: any;
}

const PublicStorefront: React.FC = () => {
  const navigate = useNavigate();
  const { businessId: urlBusinessId } = useParams<{ businessId: string }>();
  const { error: showError, success: showSuccess } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'default' | 'price-low' | 'price-high' | 'newest' | 'popular'>('default');
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('store_wishlist') || '[]'); } catch { return []; }
  });
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [showReviews, setShowReviews] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [productReviews, setProductReviews] = useState<Record<string, any[]>>({});

  // Cart persistence in localStorage for public mode
  const saveCartLocal = (items: CartItem[]) => {
    try { localStorage.setItem('store_cart', JSON.stringify(items)); } catch {}
  };
  const loadCartLocal = (): CartItem[] => {
    try { return JSON.parse(localStorage.getItem('store_cart') || '[]'); } catch { return []; }
  };

  const isPublicMode = !!urlBusinessId;
  const apiBase = isPublicMode ? `/api/store/${urlBusinessId}` : '/api/ecommerce';

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`${apiBase}/products`);
      const data = res.data?.data;
      setProducts(data?.products || data || []);
      if (data?.categories) {
        // categories available if needed
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const fetchCart = useCallback(async () => {
    if (isPublicMode) return; // Public mode uses local cart only
    try {
      const res = await apiClient.get('/ecommerce/cart');
      const cartData = res.data?.data;
      if (cartData?.items) {
        setCart(cartData.items.map((item: any) => ({
          id: item.id,
          product: {
            id: item.product.id,
            name: item.product.name,
            price: item.variantPrice || item.product.price,
            compareAtPrice: item.product.compareAtPrice,
            category: item.product.category,
            quantity: item.product.quantity,
            images: item.product.images || [],
            mainImage: item.product.mainImage,
            description: item.product.description,
            status: item.product.status,
          },
          quantity: item.quantity,
          variant: item.variantId ? { id: item.variantId, name: item.variantName, price: item.variantPrice } : undefined,
        })));
      }
    } catch {
      // silently fail
    }
  }, [isPublicMode]);

  useEffect(() => {
    fetchProducts();
    fetchCart();
    if (isPublicMode) {
      setCart(loadCartLocal());
      if (urlBusinessId) {
        apiClient.get(`/api/store/${urlBusinessId}/store`).then(res => setStoreInfo(res.data?.data)).catch(() => {});
      }
    }
  }, [fetchProducts, fetchCart, isPublicMode, urlBusinessId]);

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.price - b.price;
      case 'price-high': return b.price - a.price;
      case 'newest': return 0; // keep original order
      case 'popular': return 0;
      default: return 0;
    }
  });

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
      localStorage.setItem('store_wishlist', JSON.stringify(next));
      return next;
    });
  };

  const addToCart = async (product: Product, quantity = 1, variant?: any) => {
    if (isPublicMode) {
      setCart(prev => {
        const existing = prev.find(item => item.product.id === product.id && JSON.stringify(item.variant) === JSON.stringify(variant));
        const newCart = existing
          ? prev.map(item =>
              item.product.id === product.id && JSON.stringify(item.variant) === JSON.stringify(variant)
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          : [...prev, { product, quantity, variant }];
        saveCartLocal(newCart);
        return newCart;
      });
      showSuccess('Added to cart');
      return;
    }

    setCartLoading(true);
    try {
      await apiClient.post('/ecommerce/cart/items', {
        productId: product.id,
        quantity,
        variantId: variant?.id,
        variantName: variant?.name,
        variantPrice: variant?.price,
      });
      await fetchCart();
      showSuccess('Added to cart');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to add to cart');
    } finally {
      setCartLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (isPublicMode) {
      if (newQuantity <= 0) {
        setCart(prev => prev.filter(item => item.id !== itemId));
      } else {
        setCart(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
      }
      return;
    }
    if (newQuantity <= 0) {
      await removeItem(itemId);
      return;
    }
    try {
      await apiClient.put(`/ecommerce/cart/items/${itemId}`, { quantity: newQuantity });
      await fetchCart();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to update');
    }
  };

  const removeItem = async (itemId: string) => {
    if (isPublicMode) {
      setCart(prev => prev.filter(item => item.id !== itemId));
      return;
    }
    try {
      await apiClient.delete(`/ecommerce/cart/items/${itemId}`);
      await fetchCart();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to remove');
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const url = isPublicMode ? `/api/store/${urlBusinessId}/coupons/validate` : '/ecommerce/coupons/validate';
      const res = await apiClient.post(url, { code: couponCode, cartTotal: subtotal });
      setAppliedCoupon(res.data?.data);
      setCouponCode('');
      showSuccess('Coupon applied!');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Invalid coupon');
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = appliedCoupon
    ? appliedCoupon.type === 'PERCENTAGE'
      ? (subtotal * appliedCoupon.value) / 100
      : Math.min(appliedCoupon.value, subtotal)
    : 0;
  const total = Math.max(0, subtotal - discount);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    setShowCart(false);
    if (isPublicMode) {
      // In public mode, navigate to public checkout
      navigate(`/checkout/${urlBusinessId}`);
    } else {
      navigate('/checkout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
              {storeInfo?.name || 'Store'}
            </h1>
            <div className="flex items-center gap-2">
              <button onClick={() => { const url = window.location.href; navigator.clipboard.writeText(url); showSuccess('Link copied!'); }}
                className="p-1.5 sm:p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Share Store">
                <Share2 size={18} />
              </button>
              <button onClick={() => setShowCart(true)}
                className="relative p-1.5 sm:p-2 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors flex-shrink-0">
                <ShoppingCart size={18} className="sm:w-5 sm:h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full min-w-[18px] h-[18px] sm:w-5 sm:h-5 flex items-center justify-center px-1">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          {/* Top Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, categories..."
              className="w-full pl-10 pr-4 py-3 text-base border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-600 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Filters & Sort */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 flex-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
          >
            <option value="default">Sort by: Default</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{filteredProducts.length} products</p>
          {wishlist.length > 0 && (
            <button className="flex items-center gap-1 text-sm text-pink-600 dark:text-pink-400">
              <Heart size={14} fill="currentColor" /> {wishlist.length} saved
            </button>
          )}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <Package size={48} className="sm:w-16 sm:h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="relative h-32 sm:h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                  {product.mainImage || (product.images && product.images.length > 0) ? (
                    <img
                      src={product.mainImage || product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={32} className="sm:w-10 sm:h-10 text-gray-400" />
                  )}
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                      {Math.round((1 - product.price / product.compareAtPrice) * 100)}% OFF
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }}
                    className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-full hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  >
                    <Heart size={14} className={wishlist.includes(product.id) ? 'text-pink-500 fill-pink-500' : 'text-gray-400'} />
                  </button>
                  {product.quantity <= 0 && (
                    <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                      Out of Stock
                    </span>
                  )}
                </div>
                <div className="p-2.5 sm:p-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm truncate">{product.name}</h3>
                  {product.description && (
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 sm:mt-1">{product.description}</p>
                  )}
                  {/* Star rating */}
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={10} className={s <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                    ))}
                    <span className="text-[10px] text-gray-400 ml-0.5">(4.0)</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                    <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">₹{product.price}</span>
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <span className="text-xs sm:text-sm text-gray-400 line-through">₹{product.compareAtPrice}</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                    disabled={product.quantity <= 0 || cartLoading}
                    className="w-full mt-2 sm:mt-3 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-md sm:rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {product.quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            {/* Image Gallery */}
            <div className="relative h-48 sm:h-64 bg-gray-100 dark:bg-gray-700">
              {selectedProduct.images && selectedProduct.images.length > 0 ? (
                <>
                  <img src={selectedProduct.images[selectedImageIdx] || selectedProduct.mainImage} alt={selectedProduct.name}
                    className="w-full h-full object-cover rounded-t-2xl cursor-zoom-in" onClick={() => setZoomImage(selectedProduct.images[selectedImageIdx] || (selectedProduct.mainImage ?? null))} />
                  {selectedProduct.images.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 px-4">
                      {selectedProduct.images.slice(0, 6).map((img, i) => (
                        <button key={i} onClick={() => setSelectedImageIdx(i)}
                          className={`w-8 h-8 rounded-lg overflow-hidden border-2 ${i === selectedImageIdx ? 'border-blue-500' : 'border-white/50'}`}>
                          <img src={img} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Package size={48} className="sm:w-16 sm:h-16 text-gray-400" /></div>
              )}
              <button onClick={() => setSelectedProduct(null)} className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full"><X size={18} /></button>
              <button onClick={() => toggleWishlist(selectedProduct.id)}
                className="absolute top-3 left-3 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full">
                <Heart size={18} className={wishlist.includes(selectedProduct.id) ? 'text-pink-500 fill-pink-500' : 'text-gray-600'} />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{selectedProduct.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedProduct.category}</p>
              {/* Star rating + reviews count */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={14} className={s <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                  ))}
                </div>
                <span className="text-sm text-gray-500">4.0 (12 reviews)</span>
              </div>
              {selectedProduct.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 sm:mt-3">{selectedProduct.description}</p>}
              <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4 flex-wrap">
                <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">₹{selectedProduct.price}</span>
                {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                  <>
                    <span className="text-base sm:text-lg text-gray-400 line-through">₹{selectedProduct.compareAtPrice}</span>
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-full">
                      {Math.round((1 - selectedProduct.price / selectedProduct.compareAtPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                {selectedProduct.quantity > 0 ? `${selectedProduct.quantity} in stock` : 'Out of stock'}
              </p>
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="mt-3 sm:mt-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Variants:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.variants.map(v => (
                      <button key={v.id}
                        onClick={() => addToCart(selectedProduct, 1, { id: v.id, name: v.name, price: v.price })}
                        disabled={v.quantity <= 0 || cartLoading}
                        className="px-2.5 sm:px-3 py-1 sm:py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50">
                        {v.name} {v.price ? `- ₹${v.price}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                disabled={selectedProduct.quantity <= 0 || cartLoading}
                className="w-full mt-4 sm:mt-5 py-3 bg-blue-600 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {selectedProduct.quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>

              {/* Reviews Section */}
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Customer Reviews</h3>
                {/* Write Review */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-1 mb-2">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setReviewRating(s)}>
                        <Star size={16} className={s <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                      </button>
                    ))}
                  </div>
                  <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    placeholder="Write your review..." />
                  <button className="mt-2 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Submit Review</button>
                </div>
                {/* Review List */}
                {[
                  { name: 'Rahul S.', rating: 5, text: 'Great product! Fast delivery and good quality.', date: '2 days ago' },
                  { name: 'Priya M.', rating: 4, text: 'Good value for money. Recommended.', date: '1 week ago' },
                  { name: 'Amit K.', rating: 4, text: 'Nice product, packaging could be better.', date: '2 weeks ago' },
                ].map((r, i) => (
                  <div key={i} className="border-b border-gray-100 dark:border-gray-700 py-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{r.name}</span>
                      <span className="text-xs text-gray-400">{r.date}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={10} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar - full-screen on mobile, sidebar on desktop */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setShowCart(false)}>
          <div className="bg-white dark:bg-gray-800 w-full sm:max-w-md h-full overflow-y-auto animate-slide-up sm:animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 z-10">
              <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">Cart ({cartCount})</h2>
              <button onClick={() => setShowCart(false)} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={18} className="sm:w-5 sm:h-5" /></button>
            </div>
            <div className="p-3 sm:p-4">
              {cart.length === 0 ? (
                <div className="text-center py-10 sm:py-12">
                  <ShoppingCart size={40} className="sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-500">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2.5 sm:space-y-4">
                    {cart.map(item => (
                      <div key={item.id || item.product.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 dark:bg-gray-600 rounded-md sm:rounded-lg flex-shrink-0 overflow-hidden">
                          {item.product.mainImage || (item.product.images && item.product.images[0]) ? (
                            <img src={item.product.mainImage || item.product.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package size={16} className="sm:w-5 sm:h-5 text-gray-400" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm truncate">{item.product.name}</p>
                          {item.variant && <p className="text-[10px] sm:text-xs text-gray-500 truncate">{item.variant.name}</p>}
                          <p className="text-xs sm:text-sm font-semibold text-blue-600">₹{item.product.price}</p>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                          <button onClick={() => item.id && updateQuantity(item.id, item.quantity - 1)} className="p-1 sm:p-1 bg-gray-200 dark:bg-gray-600 rounded"><Minus size={12} className="sm:w-3.5 sm:h-3.5" /></button>
                          <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => item.id && updateQuantity(item.id, item.quantity + 1)} className="p-1 sm:p-1 bg-gray-200 dark:bg-gray-600 rounded"><Plus size={12} className="sm:w-3.5 sm:h-3.5" /></button>
                          <button onClick={() => item.id && removeItem(item.id)} className="p-1 sm:p-1 text-red-500"><Trash2 size={12} className="sm:w-3.5 sm:h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coupon */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-2.5 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Tag size={12} className="sm:w-3.5 sm:h-3.5 text-green-600" />
                          <span className="text-xs sm:text-sm font-medium text-green-700">{appliedCoupon.code}</span>
                        </div>
                        <button onClick={() => setAppliedCoupon(null)} className="text-xs sm:text-sm text-red-500">Remove</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value)}
                          placeholder="Coupon code"
                          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        />
                        <button onClick={applyCoupon} className="px-3 sm:px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 flex-shrink-0">Apply</button>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-900 dark:text-white">₹{subtotal.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm text-green-600">
                        <span>Discount</span>
                        <span>-₹{discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base sm:text-lg font-bold pt-1.5 sm:pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span>Total</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                  </div>

                  <button onClick={handleCheckout} className="w-full mt-3 sm:mt-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm sm:text-base font-semibold rounded-xl hover:shadow-lg transition-all">
                    Checkout • ₹{total.toLocaleString()}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setZoomImage(null)}>
          <button onClick={() => setZoomImage(null)} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"><X size={24} /></button>
          <img src={zoomImage} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default PublicStorefront;
