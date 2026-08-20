import React, { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import apiClient from '../lib/api';

interface Props {
  productId: string;
  businessId?: string;
  className?: string;
  showCount?: boolean;
  count?: number;
}

const WishlistButton: React.FC<Props> = ({ productId, businessId, className = '', showCount, count }) => {
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkWishlist = useCallback(async () => {
    try {
      const res = await apiClient.get(`/store-features/wishlist/check/${productId}`);
      setInWishlist(res.data.inWishlist || res.data.isInWishlist || false);
    } catch {
      setInWishlist(false);
    }
  }, [productId]);

  useEffect(() => {
    checkWishlist();
  }, [checkWishlist]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (inWishlist) {
        await apiClient.delete(`/store-features/wishlist/${productId}`);
        setInWishlist(false);
      } else {
        await apiClient.post('/store-features/wishlist', { productId, businessId });
        setInWishlist(true);
      }
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 transition-colors ${className}`}
      title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart
        size={18}
        className={`transition-colors w-[18px] h-[18px] sm:w-5 sm:h-5 ${
          inWishlist ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-400'
        } ${loading ? 'opacity-50' : ''}`}
      />
      {showCount && (
        <span className="text-sm text-gray-600 dark:text-gray-300">{count ?? 0}</span>
      )}
    </button>
  );
};

export default WishlistButton;
