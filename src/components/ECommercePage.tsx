import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Package, ShoppingCart, TrendingUp, Eye, Edit, Trash2, Share2, X, MessageSquare, Upload, AlertTriangle, Tag, Percent, Trash, Minus, Plus as PlusIcon, Check, Clock, Truck, CreditCard, ExternalLink, Store, Copy, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { useToast } from './Toast';

interface ProductVariant {
  id?: string;
  size?: string;
  color?: string;
  price: number;
  stock: number;
  name?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  comparePrice?: number;
  compareAtPrice?: number;
  category: string;
  stock: number;
  quantity?: number;
  lowStockThreshold?: number;
  image?: string;
  images?: string[];
  mainImage?: string;
  status: 'active' | 'draft' | 'archived';
  sku: string;
  description?: string;
  variants?: ProductVariant[];
  rating?: number;
  numReviews?: number;
  isActive?: boolean;
}

interface CartItem {
  id?: string;
  product: Product;
  quantity: number;
  variant?: ProductVariant;
  variantName?: string;
  variantPrice?: number;
}

interface Coupon {
  id?: string;
  code: string;
  type: 'percentage' | 'fixed' | 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrder?: number;
  maxUses?: number;
  usedCount?: number;
  expiresAt?: string;
  active: boolean;
  description?: string;
}

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variant?: ProductVariant;
  total?: number;
}

interface Order {
  id: string;
  orderNumber: string;
  contactId?: string;
  contact?: { name: string; phone: string; email: string };
  customerName?: string;
  phone?: string;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  discountAmount?: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus?: string;
  createdAt?: string;
  date?: string;
  paymentMethod?: string;
  gateway?: string;
  address?: string;
  shippingAddress?: any;
  couponCode?: string;
  notes?: string;
}

const orderStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <Clock size={14} /> },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: <Check size={14} /> },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <Truck size={14} /> },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: <Check size={14} /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: <X size={14} /> },
  refunded: { label: 'Refunded', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', icon: <CreditCard size={14} /> },
};

const productStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  archived: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
};

const ecommerceAPI = {
  listProducts: () => apiClient.get('/ecommerce/products'),
  createProduct: (data: any) => apiClient.post('/ecommerce/products', data),
  updateProduct: (id: string, data: any) => apiClient.put(`/ecommerce/products/${id}`, data),
  deleteProduct: (id: string) => apiClient.delete(`/ecommerce/products/${id}`),
  listOrders: () => apiClient.get('/ecommerce/orders'),
  updateOrderStatus: (id: string, status: string) => apiClient.patch(`/ecommerce/orders/${id}/status`, { status }),
  getCart: () => apiClient.get('/ecommerce/cart'),
  addToCart: (data: any) => apiClient.post('/ecommerce/cart/items', data),
  updateCartItem: (id: string, quantity: number) => apiClient.put(`/ecommerce/cart/items/${id}`, { quantity }),
  removeCartItem: (id: string) => apiClient.delete(`/ecommerce/cart/items/${id}`),
  listCoupons: () => apiClient.get('/ecommerce/coupons'),
  createCoupon: (data: any) => apiClient.post('/ecommerce/coupons', data),
  deleteCoupon: (id: string) => apiClient.delete(`/ecommerce/coupons/${id}`),
};

const ECommercePage: React.FC = () => {
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const [tab, setTab] = useState<'products' | 'orders' | 'coupons'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartLoading, setCartLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, ordersRes, couponsRes, cartRes] = await Promise.allSettled([
        ecommerceAPI.listProducts(),
        ecommerceAPI.listOrders(),
        ecommerceAPI.listCoupons(),
        ecommerceAPI.getCart(),
      ]);

      if (productsRes.status === 'fulfilled') {
        setProducts(productsRes.value.data?.data?.products || productsRes.value.data?.data || []);
      }
      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value.data?.data?.orders || ordersRes.value.data?.data || []);
      }
      if (couponsRes.status === 'fulfilled') {
        setCoupons(couponsRes.value.data?.data?.coupons || couponsRes.value.data?.data || []);
      }
      if (cartRes.status === 'fulfilled') {
        const cartData = cartRes.value.data?.data;
        if (cartData?.items) {
          setCart(cartData.items.map((item: any) => ({
            id: item.id,
            product: {
              id: item.product.id,
              name: item.product.name,
              price: item.variantPrice || item.product.price,
              comparePrice: item.product.compareAtPrice,
              category: item.product.category,
              stock: item.product.quantity,
              images: item.product.images || [],
              mainImage: item.product.mainImage,
              status: item.product.status,
              sku: item.product.sku,
              description: item.product.description,
            },
            quantity: item.quantity,
            variantName: item.variantName,
            variantPrice: item.variantPrice,
          })));
        }
      }
    } catch {
      setProducts([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = useMemo(() => products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  ), [products, searchQuery]);

  const filteredOrders = useMemo(() => orders.filter(o => {
    const name = o.contact?.name || o.customerName || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
  }), [orders, searchQuery]);

  const lowStockProducts = useMemo(() => products.filter(p => {
    const stock = p.stock || p.quantity || 0;
    return stock > 0 && stock <= 10;
  }), [products]);

  const ecommerceStats = useMemo(() => {
    const totalRevenue = orders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded').reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    return { totalRevenue, totalOrders, activeProducts, pendingOrders };
  }, [orders, products]);

  const { totalRevenue, totalOrders, activeProducts, pendingOrders } = ecommerceStats;

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.variantPrice || item.product.price) * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = async (product: Product, quantity: number = 1, variant?: ProductVariant) => {
    setCartLoading(true);
    try {
      await ecommerceAPI.addToCart({
        productId: product.id,
        quantity,
        variantId: variant?.id,
        variantName: variant?.name || (variant?.size || '') + (variant?.color ? ` ${variant.color}` : ''),
        variantPrice: variant?.price,
      });
      await fetchData();
      showSuccess('Added to cart');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to add to cart');
    } finally {
      setCartLoading(false);
    }
  };

  const updateCartQuantity = async (itemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await ecommerceAPI.removeCartItem(itemId);
      } else {
        await ecommerceAPI.updateCartItem(itemId, quantity);
      }
      await fetchData();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to update cart');
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      await ecommerceAPI.removeCartItem(itemId);
      await fetchData();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to remove from cart');
    }
  };

  const handleAddProduct = async (productData: any) => {
    try {
      if (editingProduct) {
        await ecommerceAPI.updateProduct(editingProduct.id, productData);
        showSuccess('Product updated');
      } else {
        await ecommerceAPI.createProduct(productData);
        showSuccess('Product added');
      }
      await fetchData();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to save product');
    }
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await ecommerceAPI.deleteProduct(id);
      showSuccess('Product deleted');
      await fetchData();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to delete product');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await ecommerceAPI.updateOrderStatus(orderId, newStatus);
      showSuccess('Order status updated');
      await fetchData();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to update order');
    }
  };

  const handleAddCoupon = async (couponData: any) => {
    try {
      await ecommerceAPI.createCoupon(couponData);
      showSuccess('Coupon created');
      await fetchData();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to create coupon');
    }
    setShowAddCouponModal(false);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await ecommerceAPI.deleteCoupon(id);
      showSuccess('Coupon deleted');
      await fetchData();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to delete coupon');
    }
  };

  const copyShareLink = (productId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/store?product=${productId}`);
    showSuccess('Link copied!');
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-5 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading e-commerce data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-4 sm:p-5 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">E-Commerce</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage products, orders, and coupons</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/store-share')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all"
          >
            <QrCode size={18} />
            <span>Share Store</span>
          </button>
          <button
            onClick={() => navigate('/analytics')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all"
          >
            <TrendingUp size={18} />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => navigate('/bulk-import')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-all"
          >
            <Upload size={18} />
            <span>Import/Export</span>
          </button>
          <button
            onClick={() => navigate('/shipping-settings')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all"
          >
            <Truck size={18} />
            <span>Shipping</span>
          </button>
          <button
            onClick={() => navigate('/store')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all"
          >
            <Store size={18} />
            <span>View Store</span>
            <ExternalLink size={14} />
          </button>
          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
          >
            <ShoppingCart size={18} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowCouponModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            <Tag size={18} />
            <span>Coupons</span>
          </button>
          <button
            onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
          >
            <Plus size={18} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium mb-3">
            <AlertTriangle size={18} />
            Low Stock Alert ({lowStockProducts.length} items need restocking)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStockProducts.slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  {(p.mainImage || (p.images && p.images[0])) ? <img src={p.mainImage || p.images?.[0]} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <Package size={16} className="text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">{p.stock || p.quantity || 0} left</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2"><TrendingUp size={16} /><span className="text-sm">Revenue</span></div>
          <p className="text-xl sm:text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2"><Package size={16} /><span className="text-sm">Total Orders</span></div>
          <p className="text-xl sm:text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{totalOrders}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2"><ShoppingCart size={16} /><span className="text-sm">Pending Orders</span></div>
          <p className="text-xl sm:text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingOrders}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2"><Package size={16} /><span className="text-sm">Active Products</span></div>
          <p className="text-xl sm:text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{activeProducts}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex gap-4">
          {(['products', 'orders', 'coupons'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)} ({t === 'products' ? products.length : t === 'orders' ? orders.length : coupons.length})
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={tab === 'products' ? 'Search products...' : tab === 'orders' ? 'Search orders...' : 'Search coupons...'} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>

      {/* Products Tab */}
      {tab === 'products' && (
        <>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">{searchQuery ? 'No products found' : 'No products yet'}</p>
              <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className="px-4 sm:px-5 md:px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">Add Your First Product</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                    {(product.mainImage || (product.images && product.images.length > 0)) ? (
                      <img src={product.mainImage || product.images?.[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={40} className="text-gray-400" />
                    )}
                    {product.status && (
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${productStatusColors[product.status] || ''}`}>{product.status}</span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{product.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${(product.stock || product.quantity || 0) === 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'}`}>
                        {(product.stock || product.quantity || 0) === 0 ? 'Out of stock' : `${product.stock || product.quantity || 0} in stock`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">₹{product.price}</span>
                      {(product.comparePrice || product.compareAtPrice) && (
                        <span className="text-sm text-gray-400 line-through">₹{product.comparePrice || product.compareAtPrice}</span>
                      )}
                      {(product.comparePrice || product.compareAtPrice) && (
                        <span className="text-xs bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full">
                          {Math.round((1 - product.price / (product.comparePrice || product.compareAtPrice || 1)) * 100)}% off
                        </span>
                      )}
                    </div>
                    {product.variants && product.variants.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {product.variants.map((v, i) => (
                          <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{v.name || `${v.size || ''} ${v.color || ''}`}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => addToCart(product)} disabled={(product.stock || product.quantity || 0) <= 0 || cartLoading} className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {(product.stock || product.quantity || 0) <= 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                      <button onClick={() => copyShareLink(product.id)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Share"><Share2 size={16} /></button>
                      <button onClick={() => { setEditingProduct(product); setShowProductModal(true); }} className="p-2 text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400" title="Edit"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">#{order.orderNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${orderStatusConfig[order.status]?.color || ''}`}>
                          {orderStatusConfig[order.status]?.icon}
                          {orderStatusConfig[order.status]?.label || order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{order.contact?.name || order.customerName || 'N/A'} • {order.contact?.phone || order.phone || ''}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : order.date || ''}
                        {order.gateway && ` • ${order.gateway === 'cod' ? 'COD' : 'Online'}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">₹{order.total.toLocaleString()}</p>
                        {(order.discountAmount || 0) > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400">-₹{order.discountAmount} discount</p>
                        )}
                      </div>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Coupons Tab */}
      {tab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddCouponModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
              <Plus size={16} /> Add Coupon
            </button>
          </div>
          {coupons.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Tag size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No coupons yet</p>
            </div>
          ) : (
            coupons.map(coupon => (
              <div key={coupon.id || coupon.code} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Percent size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{coupon.code}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {(coupon.type === 'percentage' || coupon.type === 'PERCENTAGE') ? `${coupon.value}% off` : `₹${coupon.value} off`}
                        {coupon.minOrder && coupon.minOrder > 0 && ` • Min order ₹${coupon.minOrder}`}
                      </p>
                      {coupon.maxUses && (
                        <p className="text-xs text-gray-400">{coupon.usedCount || 0}/{coupon.maxUses} used</p>
                      )}
                      {coupon.expiresAt && (
                        <p className="text-xs text-gray-400">Expires: {new Date(coupon.expiresAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${coupon.active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                      {coupon.active ? 'Active' : 'Inactive'}
                    </span>
                    {coupon.id && (
                      <button onClick={() => handleDeleteCoupon(coupon.id!)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showProductModal && (
        <AddProductModal
          product={editingProduct}
          onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
          onAdd={handleAddProduct}
        />
      )}

      {/* Cart Modal */}
      {showCart && (
        <CartModal
          cart={cart}
          subtotal={cartSubtotal}
          onUpdateQuantity={updateCartQuantity}
          onRemove={removeFromCart}
          onClose={() => setShowCart(false)}
          onCheckout={() => { setShowCart(false); navigate('/checkout'); }}
        />
      )}

      {/* Coupon Display Modal */}
      {showCouponModal && (
        <CouponDisplayModal
          coupons={coupons}
          onClose={() => setShowCouponModal(false)}
        />
      )}

      {/* Add Coupon Modal */}
      {showAddCouponModal && (
        <AddCouponModal
          onClose={() => setShowAddCouponModal(false)}
          onAdd={handleAddCoupon}
        />
      )}
    </div>
  );
};

// ==================== Add/Edit Product Modal ====================
const AddProductModal: React.FC<{
  onClose: () => void;
  onAdd: (product: any) => void;
  product?: Product | null;
}> = ({ onClose, onAdd, product }) => {
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [comparePrice, setComparePrice] = useState((product?.comparePrice || product?.compareAtPrice || '')?.toString() || '');
  const [category, setCategory] = useState(product?.category || 'General');
  const [stock, setStock] = useState((product?.stock || product?.quantity || '')?.toString() || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [description, setDescription] = useState(product?.description || '');
  const [productImages, setProductImages] = useState<string[]>(product?.images || (product?.mainImage ? [product.mainImage] : []));
  const [status, setStatus] = useState(product?.status || 'active');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProductImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmit = () => {
    if (!name || !price) return;
    onAdd({
      name,
      price: parseFloat(price),
      compareAtPrice: comparePrice ? parseFloat(comparePrice) : null,
      category,
      quantity: parseInt(stock) || 0,
      trackInventory: true,
      sku: sku || `SKU-${Date.now()}`,
      description,
      images: productImages,
      mainImage: productImages[0] || null,
      status,
      isActive: status === 'active',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Images</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {productImages.map((img, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 group">
                  <img src={img} alt={`Product ${i + 1}`} className="w-full h-20 object-cover" />
                  <button type="button" onClick={() => setProductImages(prev => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                  {i === 0 && <span className="absolute bottom-0 left-0 bg-blue-500 text-white text-[10px] px-1">Main</span>}
                </div>
              ))}
              {productImages.length < 8 && (
                <label className="w-full h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors">
                  <Plus size={16} className="text-gray-400" />
                  <span className="text-[10px] text-gray-400">Add</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Product name" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price (₹) *</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="499" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Compare Price (₹)</label>
              <input type="number" value={comparePrice} onChange={e => setComparePrice(e.target.value)} placeholder="699" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock</label>
              <input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="50" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Category" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as "active" | "draft" | "archived")} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
            <input type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="SKU-001" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Product description..." rows={3} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={!name || !price} className="px-4 sm:px-5 md:px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all">
            {product ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== Cart Modal ====================
const CartModal: React.FC<{
  cart: CartItem[];
  subtotal: number;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onClose: () => void;
  onCheckout: () => void;
}> = ({ cart, subtotal, onUpdateQuantity, onRemove, onClose, onCheckout }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shopping Cart ({cart.length})</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="p-4">
          {cart.length === 0 ? (
            <div className="text-center py-4 sm:py-6 md:py-8">
              <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {cart.map(item => (
                  <div key={item.id || item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="w-14 h-14 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {(item.product.mainImage || (item.product.images && item.product.images[0])) ? (
                        <img src={item.product.mainImage || item.product.images?.[0]} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package size={20} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.product.name}</p>
                      {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                      <p className="text-sm font-semibold text-blue-600">₹{(item.variantPrice || item.product.price).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.id && (
                        <>
                          <button onClick={() => onUpdateQuantity(item.id!, item.quantity - 1)} className="p-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300"><Minus size={14} /></button>
                          <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                          <button onClick={() => onUpdateQuantity(item.id!, item.quantity + 1)} className="p-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300"><PlusIcon size={14} /></button>
                          <button onClick={() => onRemove(item.id!)} className="p-1 text-red-500 hover:text-red-700"><Trash size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">₹{subtotal.toLocaleString()}</span>
                </div>
              </div>
              <button onClick={onCheckout} className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                Checkout • ₹{subtotal.toLocaleString()}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Coupon Display Modal ====================
const CouponDisplayModal: React.FC<{
  coupons: Coupon[];
  onClose: () => void;
}> = ({ coupons, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Available Coupons</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {coupons.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No coupons available</p>
          ) : (
            coupons.filter(c => c.active).map(coupon => (
              <div key={coupon.id || coupon.code} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Percent size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{coupon.code}</p>
                      <p className="text-sm text-gray-500">
                        {(coupon.type === 'percentage' || coupon.type === 'PERCENTAGE') ? `${coupon.value}% off` : `₹${coupon.value} off`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(coupon.code); }} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Copy</button>
                </div>
                {coupon.minOrder && coupon.minOrder > 0 && <p className="text-xs text-gray-500 mt-2">Min order: ₹{coupon.minOrder}</p>}
                {coupon.expiresAt && <p className="text-xs text-gray-400 mt-1">Expires: {new Date(coupon.expiresAt).toLocaleDateString()}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Add Coupon Modal ====================
const AddCouponModal: React.FC<{
  onClose: () => void;
  onAdd: (coupon: any) => void;
}> = ({ onClose, onAdd }) => {
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!code || !value) return;
    onAdd({
      code: code.toUpperCase(),
      type,
      value: parseFloat(value),
      minOrder: minOrder ? parseFloat(minOrder) : 0,
      maxUses: maxUses ? parseInt(maxUses) : null,
      expiresAt: expiresAt || null,
      description: description || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Coupon</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coupon Code *</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. SAVE20" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
              <select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value *</label>
              <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder={type === 'PERCENTAGE' ? '20' : '100'} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Order (₹)</label>
              <input type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} placeholder="500" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Uses</label>
              <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="100" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date</label>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={!code || !value} className="px-4 sm:px-5 md:px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all">Create Coupon</button>
        </div>
      </div>
    </div>
  );
};

export default ECommercePage;

