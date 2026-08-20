import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, Truck, XCircle, ArrowLeft, Copy, MapPin, CreditCard } from 'lucide-react';
import apiClient from '../lib/api';
import { useToast } from './Toast';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  product?: { name: string; images: string[] };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  shippingAddress: any;
  gateway?: string;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: <Clock size={20} />, description: 'Your order has been received' },
  { key: 'processing', label: 'Confirmed', icon: <CheckCircle size={20} />, description: 'Your order is being prepared' },
  { key: 'shipped', label: 'Shipped', icon: <Truck size={20} />, description: 'Your order is on the way' },
  { key: 'delivered', label: 'Delivered', icon: <Package size={20} />, description: 'Your order has been delivered' },
];

const statusColors: Record<string, string> = {
  pending: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300',
  processing: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300',
  shipped: 'text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300',
  delivered: 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-300',
  cancelled: 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300',
  refunded: 'text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300',
};

const OrderTrackingPage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(orderNumber || '');

  const fetchOrder = useCallback(async (num: string) => {
    if (!num) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.get(`/ecommerce/track/${num}`);
      setOrder(res.data?.data);
    } catch {
      setOrder(null);
      showError('Order not found');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (orderNumber) {
      fetchOrder(orderNumber);
      setSearchInput(orderNumber);
    }
  }, [orderNumber, fetchOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/order-tracking/${searchInput.trim()}`);
    }
  };

  const copyOrderNumber = () => {
    if (order) {
      navigator.clipboard.writeText(order.orderNumber);
    }
  };

  const currentStepIndex = order ? statusSteps.findIndex(s => s.key === order.status) : -1;
  const isCancelled = order?.status === 'cancelled' || order?.status === 'refunded';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/store')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Track Order</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5 md:py-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Enter order number (e.g. ORD-123456-ABC)"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="px-4 sm:px-5 md:px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              Track
            </button>
          </div>
        </form>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading order details...</p>
          </div>
        ) : !order ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Package size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No order found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Enter your order number above to track</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">#{order.orderNumber}</h2>
                    <button onClick={copyOrderNumber} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Copy size={14} className="text-gray-400" /></button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1 ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {statusSteps.find(s => s.key === order.status)?.icon}
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                  }`}>
                    {order.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Tracker */}
            {!isCancelled && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  {statusSteps.map((step, i) => (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center text-center flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                          i <= currentStepIndex
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                        }`}>
                          {step.icon}
                        </div>
                        <p className={`text-xs font-medium ${i <= currentStepIndex ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{step.label}</p>
                        <p className="text-[10px] text-gray-400 hidden sm:block mt-1">{step.description}</p>
                      </div>
                      {i < statusSteps.length - 1 && (
                        <div className={`w-8 sm:w-16 h-0.5 mt-[-20px] sm:mt-0 ${i < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 sm:p-5 md:p-6 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <XCircle size={24} className="text-red-600" />
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-400">Order {order.status === 'cancelled' ? 'Cancelled' : 'Refunded'}</p>
                    <p className="text-sm text-red-600 dark:text-red-300">This order has been {order.status}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Order Items</h3>
              <div className="space-y-3">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.product?.images?.[0] ? (
                        <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package size={16} className="m-auto mt-3 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity} × ₹{item.price}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">₹{item.total.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary & Shipping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><CreditCard size={16} /> Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-900 dark:text-white">₹{order.subtotal.toLocaleString()}</span></div>
                  {order.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{order.discountAmount.toLocaleString()}</span></div>}
                  <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span className="text-green-600">Free</span></div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700"><span>Total</span><span>₹{order.total.toLocaleString()}</span></div>
                </div>
                {order.gateway && (
                  <p className="text-xs text-gray-400 mt-3">Payment via: {order.gateway === 'cod' ? 'Cash on Delivery' : 'Razorpay'}</p>
                )}
              </div>

              {order.shippingAddress && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><MapPin size={16} /> Shipping Address</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p className="font-medium text-gray-900 dark:text-white">{order.shippingAddress.name}</p>
                    <p>{order.shippingAddress.address}</p>
                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                    <p>{order.shippingAddress.phone}</p>
                    {order.shippingAddress.email && <p>{order.shippingAddress.email}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
