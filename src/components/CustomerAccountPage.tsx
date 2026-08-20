import React, { useState, useEffect, useCallback } from 'react';
import {
  User, ShoppingBag, Heart, Star, Package, Loader2, ChevronRight,
  Clock, Truck, CheckCircle, XCircle, CreditCard, MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
  paymentMethod?: string;
  shippingAddress?: string;
}

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image?: string;
  addedAt: string;
}

interface LoyaltyPoints {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  history: { date: string; points: number; type: 'earned' | 'redeemed'; description: string }[];
}

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

type Tab = 'orders' | 'wishlist' | 'loyalty' | 'profile';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <Clock size={14} /> },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: <Package size={14} /> },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <Truck size={14} /> },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: <CheckCircle size={14} /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: <XCircle size={14} /> },
};

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'orders', label: 'My Orders', icon: <ShoppingBag size={18} /> },
  { key: 'wishlist', label: 'Wishlist', icon: <Heart size={18} /> },
  { key: 'loyalty', label: 'Loyalty Points', icon: <Star size={18} /> },
  { key: 'profile', label: 'Profile', icon: <User size={18} /> },
];

const CustomerAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyPoints | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiClient.get('/ecommerce/orders');
      setOrders(res.data.orders || res.data || []);
    } catch { /* empty */ }
  }, []);

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await apiClient.get('/store-features/wishlist');
      setWishlist(res.data.items || res.data || []);
    } catch { /* empty */ }
  }, []);

  const fetchLoyalty = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const userId = res.data.id || res.data.user?.id;
      if (userId) {
        const pointsRes = await apiClient.get(`/loyalty/points/${userId}`);
        setLoyalty(pointsRes.data);
      }
    } catch { /* empty */ }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const u = res.data.user || res.data;
      setProfile({ name: u.name || '', email: u.email || '', phone: u.phone || '', address: u.address || '' });
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchOrders(), fetchWishlist(), fetchLoyalty(), fetchProfile()]);
      setLoading(false);
    };
    load();
  }, [fetchOrders, fetchWishlist, fetchLoyalty, fetchProfile]);

  const removeFromWishlist = async (productId: string) => {
    try {
      await apiClient.delete(`/store-features/wishlist/${productId}`);
      setWishlist((prev) => prev.filter((w) => w.productId !== productId));
    } catch { /* empty */ }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-5 md:p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">My Account</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
                    <ShoppingBag size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No orders yet</p>
                    <button
                      onClick={() => navigate('/store')}
                      className="mt-4 px-4 sm:px-5 md:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Browse Products
                    </button>
                  </div>
                ) : (
                  orders.map((order) => {
                    const status = statusConfig[order.status] || statusConfig.pending;
                    return (
                      <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Order #{order.orderNumber}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        <div className="space-y-2 mb-3">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{item.name} × {item.quantity}</span>
                              <span className="text-gray-900 dark:text-white font-medium">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                          <span className="text-sm text-gray-500 dark:text-gray-400">{order.items.length} item(s)</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">₹{order.total.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Wishlist Tab */}
            {activeTab === 'wishlist' && (
              <div className="space-y-4">
                {wishlist.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
                    <Heart size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Your wishlist is empty</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wishlist.map((item) => (
                      <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="w-full h-40 object-cover rounded-lg mb-3" />
                        )}
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">{item.name}</h4>
                        <p className="text-blue-600 font-bold mt-1">₹{item.price.toLocaleString('en-IN')}</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => navigate(`/product/${item.productId}`)}
                            className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            View
                          </button>
                          <button
                            onClick={() => removeFromWishlist(item.productId)}
                            className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loyalty Points Tab */}
            {activeTab === 'loyalty' && (
              <div className="space-y-6">
                {loyalty ? (
                  <>
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-5 md:p-6 text-white">
                      <p className="text-sm opacity-80">Available Points</p>
                      <p className="text-3xl sm:text-4xl font-bold mt-1">{loyalty.balance.toLocaleString()}</p>
                      <div className="flex gap-6 mt-4 text-sm">
                        <div>
                          <span className="opacity-70">Earned: </span>
                          <span className="font-medium">{loyalty.totalEarned.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="opacity-70">Redeemed: </span>
                          <span className="font-medium">{loyalty.totalRedeemed.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    {loyalty.history?.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Points History</h3>
                        <div className="space-y-3">
                          {loyalty.history.map((h, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                              <div>
                                <p className="text-sm text-gray-900 dark:text-white">{h.description}</p>
                                <p className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString('en-IN')}</p>
                              </div>
                              <span className={`font-medium ${h.type === 'earned' ? 'text-green-600' : 'text-red-600'}`}>
                                {h.type === 'earned' ? '+' : '-'}{h.points}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
                    <Star size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No loyalty data available</p>
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && profile && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700 max-w-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <User size={18} className="text-blue-600" />
                  Profile Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Name</label>
                    <p className="text-gray-900 dark:text-white font-medium">{profile.name || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Email</label>
                    <p className="text-gray-900 dark:text-white font-medium">{profile.email || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                    <p className="text-gray-900 dark:text-white font-medium">{profile.phone || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Address</label>
                    <p className="text-gray-900 dark:text-white font-medium flex items-start gap-1">
                      <MapPin size={14} className="mt-0.5 shrink-0" />
                      {profile.address || '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerAccountPage;
