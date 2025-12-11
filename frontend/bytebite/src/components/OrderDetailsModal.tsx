import { useState, useEffect } from 'react';
import { Clock, MapPin, Phone } from 'lucide-react'; // Added icons
import { api } from '../utils/api';

interface OrderItem {
  dish_id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
  chef_name: string;
  subtotal: number;
}

interface OrderDetails {
  order_id: number;
  status: string;
  total_price: number;
  vip_discount: number;
  order_time: string;
  completion_time?: string;
  delivery_person_name?: string;
  delivery_address?: string; // New
  delivery_phone?: string;   // New
  items: OrderItem[];
}

interface OrderDetailsModalProps {
  orderId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailsModal({ orderId, isOpen, onClose }: OrderDetailsModalProps) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (orderId && isOpen) {
      loadOrderDetails();
    }
  }, [orderId, isOpen]);

  const loadOrderDetails = async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.getOrderDetails(orderId);
      if (response.success) {
        setOrderDetails(response.order);
      } else {
        setError(response.message || 'Failed to load order details');
      }
    } catch (err) {
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-600';
      case 'preparing': return 'bg-blue-600';
      case 'cooking': return 'bg-orange-500'; 
      case 'ready for delivery': return 'bg-blue-500';
      case 'in transit': return 'bg-orange-600';
      case 'delivered': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[9999]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999 }}
      onClick={onClose}
    >
      <div 
        className="bg-[#0f1f3a] border border-[#00ff88]/20 rounded-lg max-w-md w-full h-[40vh] overflow-y-auto p-4 relative"
        style={{ backgroundColor: '#0f1f3a' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-white/50 hover:text-white text-xl leading-none"
        >
          &times;
        </button>

        {loading && <div className="text-center text-white p-8">Loading details...</div>}
        
        {error && (
          <div className="text-center p-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={loadOrderDetails} className="bg-[#00ff88] text-[#0a1628] px-4 py-2 rounded">Retry</button>
          </div>
        )}

        {orderDetails && !loading && (
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Order #{orderId}</h2>
                <span className={`px-3 py-1 rounded text-white text-sm ${getStatusColor(orderDetails.status)}`}>
                  {orderDetails.status}
                </span>
                <div className="mt-4 space-y-1 text-white/70 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00ff88]" />
                    {new Date(orderDetails.order_time).toLocaleString()}
                  </div>
                  
                  {/* 👇👇👇 Address Section 👇👇👇 */}
                  {orderDetails.delivery_address && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                        <MapPin className="w-4 h-4 text-[#00ff88]" />
                        <span className="text-white font-medium">{orderDetails.delivery_address}</span>
                    </div>
                  )}
                  {orderDetails.delivery_phone && (
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#00ff88]" />
                        <span>{orderDetails.delivery_phone}</span>
                    </div>
                  )}
                  {/* 👆👆👆 End Address Section 👆👆👆 */}

                  {orderDetails.delivery_person_name && (
                    <div className="mt-2 text-[#00ff88]">🚚 Delivered by: {orderDetails.delivery_person_name}</div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-white/70 text-sm">Total Amount</p>
                <p className="text-3xl font-bold text-[#00ff88]">${orderDetails.total_price.toFixed(2)}</p>
                {orderDetails.vip_discount > 0 && (
                   <p className="text-purple-400 text-sm">VIP Savings: -${orderDetails.vip_discount.toFixed(2)}</p>
                )}
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-4 border-b border-[#00ff88]/20 pb-2">Items</h3>
            <div className="space-y-4">
              {orderDetails.items.map((item, idx) => (
                <div key={idx} className="flex gap-4 bg-[#1a2f4a] p-4 rounded-lg border border-[#00ff88]/10">
                  <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-md bg-black/20" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="text-white font-medium">{item.name}</h4>
                      <span className="text-[#00ff88] font-medium">${item.subtotal.toFixed(2)}</span>
                    </div>
                    <p className="text-white/60 text-sm mb-2">{item.description}</p>
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-[#00ff88]/70">Chef: {item.chef_name}</span>
                      <div className="text-white/80 text-sm">
                        {item.quantity} x ${item.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}