import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { Package, AlertTriangle, Plus, Search, Filter, Download, Upload, TrendingDown, TrendingUp, BarChart3, Loader2 } from 'lucide-react';
import apiClient from '../lib/api';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  minStock: number;
  price: number;
  cost: number;
  category: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}

export default function InventoryManagementPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await apiClient.get('/ecommerce/products');
      const products = res.data?.data?.products || res.data?.data || [];
      setItems(products.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || `SKU-${p.id.slice(-6).toUpperCase()}`,
        quantity: p.quantity || 0,
        minStock: 10,
        price: p.price || 0,
        cost: p.cost || Math.round(p.price * 0.5) || 0,
        category: p.category || 'Uncategorized',
        status: p.quantity <= 0 ? 'out-of-stock' : p.quantity <= 10 ? 'low-stock' : 'in-stock',
      })));
    } catch {
      // Fallback to empty
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-orange-600" size={32} />
      </div>
    );
  }

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || item.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: items.length,
    totalValue: items.reduce((sum, i) => sum + (i.quantity * i.cost), 0),
    lowStock: items.filter(i => i.status === 'low-stock').length,
    outOfStock: items.filter(i => i.status === 'out-of-stock').length,
  };

  const statusColors: Record<string, string> = {
    'in-stock': 'bg-green-100 text-green-700',
    'low-stock': 'bg-yellow-100 text-yellow-700',
    'out-of-stock': 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="text-orange-600" /> Inventory Management
        </h1>
        <p className="text-gray-600 mt-1">Track stock levels and manage products</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Products</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-blue-600">₹{stats.totalValue.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Inventory Value (Cost)</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
          <div className="text-sm text-gray-500">Low Stock Alerts</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
          <div className="text-sm text-gray-500">Out of Stock</div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStock + stats.outOfStock > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="text-yellow-600 shrink-0" size={20} />
          <div className="text-sm text-yellow-800">
            <strong>{stats.lowStock + stats.outOfStock} items</strong> need restocking.
            {stats.outOfStock > 0 && ` ${stats.outOfStock} items are out of stock.`}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
            placeholder="Search products..."
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg"
        >
          <option value="all">All Status</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg">
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">Product</th>
                <th className="text-left p-4 font-medium text-gray-600">SKU</th>
                <th className="text-right p-4 font-medium text-gray-600">Qty</th>
                <th className="text-right p-4 font-medium text-gray-600">Price</th>
                <th className="text-right p-4 font-medium text-gray-600">Cost</th>
                <th className="text-center p-4 font-medium text-gray-600">Status</th>
                <th className="text-center p-4 font-medium text-gray-600">Stock Level</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.category}</div>
                  </td>
                  <td className="p-4 text-gray-600 font-mono text-xs">{item.sku}</td>
                  <td className="p-4 text-right font-medium">{item.quantity}</td>
                  <td className="p-4 text-right">₹{item.price.toLocaleString()}</td>
                  <td className="p-4 text-right text-gray-600">₹{item.cost.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                      {item.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.status === 'out-of-stock' ? 'bg-red-500' :
                          item.status === 'low-stock' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((item.quantity / (item.minStock * 3)) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Min: {item.minStock}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}