import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, Truck, CheckCircle2, XCircle, Search, Download, ChevronRight, ArrowLeft } from 'lucide-react';
import apiClient from '../lib/api';
import { useAuthStore } from '../lib/authStore';

interface Order {
  id: string;
  orderNumber: string;
  items: { name: string; price: number; quantity: number; image?: string }[];
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  shippingAddress?: any;
  gst?: number;
  shipping?: number;
  discount?: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
};

const statusSteps = ['pending', 'processing', 'shipped', 'delivered'];

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get('/ecommerce/orders');
      setOrders(res.data?.data?.orders || res.data?.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = orders.filter(o =>
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.items?.some(i => i.name.toLowerCase().includes(search.toLowerCase()))
  );

  const generateInvoice = (order: Order) => {
    const items = order.items.map(i => `${i.name} x${i.quantity} = ₹${(i.price * i.quantity).toLocaleString()}`).join('\n');
    const invoice = `
TAX INVOICE
============
Order: ${order.orderNumber}
Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}
Customer: ${user?.name || 'N/A'}
Email: ${user?.email || 'N/A'}

ITEMS:
${items}

Subtotal: ₹${order.total.toLocaleString()}
GST (18%): ₹${(order.gst || 0).toLocaleString()}
Shipping: ₹${(order.shipping || 0).toLocaleString()}
${order.discount ? `Discount: -₹${order.discount.toLocaleString()}` : ''}
TOTAL: ₹${order.total.toLocaleString()}

Payment: ${order.paymentMethod?.toUpperCase()}
Status: ${order.status}

Thank you for your purchase!
    `.trim();

    const blob = new Blob([invoice], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${order.orderNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Orders</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage your orders</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          placeholder="Search orders..."
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Package className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 dark:text-gray-400">No orders found</p>
          <button onClick={() => navigate('/store')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            Browse Store
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => {
            const currentStep = statusSteps.indexOf(order.status);
            return (
              <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Order Header */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">#{order.orderNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">₹{order.total.toLocaleString()}</span>
                    <button onClick={() => generateInvoice(order)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="Download Invoice">
                      <Download size={16} />
                    </button>
                    <button onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                      <ChevronRight size={16} className={`transition-transform ${selectedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Progress Tracker */}
                <div className="px-4 sm:px-5 py-3 bg-gray-50 dark:bg-gray-700/30">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-600">
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.max(0, currentStep / (statusSteps.length - 1)) * 100}%` }} />
                    </div>
                    {statusSteps.map((s, i) => (
                      <div key={s} className="relative z-10 flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500'
                        }`}>
                          {i <= currentStep ? <CheckCircle2 size={14} /> : i + 1}
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1 capitalize">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedOrder?.id === order.id && (
                  <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-700 space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Order Items</h4>
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                          {item.image && <img src={item.image} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <span className="text-sm font-medium">₹{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1 text-sm">
                      {order.discount ? (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span><span>-₹{order.discount.toLocaleString()}</span>
                        </div>
                      ) : null}
                      {order.shipping !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Shipping</span>
                          <span>{order.shipping === 0 ? 'Free' : `₹${order.shipping}`}</span>
                        </div>
                      )}
                      {order.gst ? (
                        <div className="flex justify-between">
                          <span className="text-gray-500">GST (18%)</span>
                          <span>₹{order.gst.toLocaleString()}</span>
                        </div>
                      ) : null}
                    </div>
                    {order.shippingAddress && (
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">Shipping Address</p>
                        <p className="text-gray-500">{order.shippingAddress.name}, {order.shippingAddress.address}, {order.shippingAddress.city} - {order.shippingAddress.pincode}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}