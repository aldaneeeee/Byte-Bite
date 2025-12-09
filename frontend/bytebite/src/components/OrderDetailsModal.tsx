import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Clock, ChefHat, X } from 'lucide-react';
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
  items: OrderItem[];
}

interface OrderDetailsModalProps {
  orderId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailsModal({ orderId, isOpen, onClose }: OrderDetailsModalProps) {
  console.log('OrderDetailsModal rendered with:', { orderId, isOpen });
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('OrderDetailsModal: Modal state changed - isOpen:', isOpen, 'orderId:', orderId);
  }, [isOpen, orderId]);

  useEffect(() => {
    if (orderId && isOpen) {
      console.log('OrderDetailsModal: Loading order details for orderId:', orderId);
      loadOrderDetails();
    }
  }, [orderId, isOpen]);

  const loadOrderDetails = async () => {
    if (!orderId) return;

    console.log('OrderDetailsModal: Starting to load order details for orderId:', orderId);
    setLoading(true);
    setError(null);

    try {
      const response = await api.getOrderDetails(orderId);
      console.log('OrderDetailsModal: API response:', response);
      if (response.success) {
        console.log('OrderDetailsModal: Setting order details:', response.order);
        setOrderDetails(response.order);
      } else {
        setError(response.message || 'Failed to load order details');
      }
    } catch (err) {
      console.log('OrderDetailsModal: Error loading order details:', err);
      setError('Failed to load order details');
      console.error('Error loading order details:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-600';
      case 'preparing':
        return 'bg-blue-600';
      case 'ready for delivery':
        return 'bg-orange-600';
      case 'in transit':
        return 'bg-purple-600';
      case 'delivered':
        return 'bg-green-600';
      case 'cancelled':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'rgba(0,0,0,0.5)', 
      zIndex: 9999,
      display: isOpen ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#0f1f3a',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        borderRadius: '8px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'white' }}>Order #{orderId}</h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            ×
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ 
              border: '2px solid #00ff88', 
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 10px'
            }}></div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: 'red' }}>{error}</p>
            <button 
              onClick={loadOrderDetails}
              style={{
                background: '#00ff88',
                color: '#0a1628',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {orderDetails && (
          <div>
            {/* Order Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ 
                  background: getStatusColor(orderDetails.status), 
                  color: 'white', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginBottom: '10px'
                }}>
                  {orderDetails.status}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  <div>Ordered: {new Date(orderDetails.order_time).toLocaleString()}</div>
                  {orderDetails.completion_time && (
                    <div>Completed: {new Date(orderDetails.completion_time).toLocaleString()}</div>
                  )}
                  {orderDetails.delivery_person_name && (
                    <div>🚚 Delivered by: {orderDetails.delivery_person_name}</div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Total</div>
                <div style={{ color: '#00ff88', fontSize: '24px', fontWeight: 'bold' }}>${orderDetails.total_price.toFixed(2)}</div>
                {orderDetails.vip_discount > 0 && (
                  <div style={{ color: '#a855f7', fontSize: '14px' }}>VIP Discount: -${orderDetails.vip_discount.toFixed(2)}</div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Order Items</h3>
              <div style={{ display: 'grid', gap: '16px' }}>
                {orderDetails.items.map((item) => (
                  <div key={item.dish_id} style={{ 
                    background: '#1a2f4a', 
                    padding: '16px', 
                    borderRadius: '8px',
                    border: '1px solid rgba(0,255,136,0.1)'
                  }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ color: 'white', fontWeight: '500', marginBottom: '4px' }}>{item.name}</h4>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '8px' }}>{item.description}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ color: 'rgba(0,255,136,0.8)', fontSize: '14px' }}>👨‍🍳 {item.chef_name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '16px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Qty: {item.quantity}</span>
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>${item.price.toFixed(2)} each</span>
                          </div>
                          <span style={{ color: '#00ff88', fontWeight: '500' }}>${item.subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div style={{ 
              background: '#1a2f4a', 
              padding: '16px', 
              borderRadius: '8px',
              border: '1px solid rgba(0,255,136,0.1)',
              marginTop: '20px'
            }}>
              <h4 style={{ color: 'white', fontWeight: '600', marginBottom: '12px' }}>Order Summary</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                  <span>Subtotal</span>
                  <span>${(orderDetails.total_price + orderDetails.vip_discount).toFixed(2)}</span>
                </div>
                {orderDetails.vip_discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a855f7' }}>
                    <span>VIP Discount</span>
                    <span>-${orderDetails.vip_discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ 
                  borderTop: '1px solid rgba(255,255,255,0.2)', 
                  paddingTop: '8px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  color: 'white',
                  fontWeight: '600'
                }}>
                  <span>Total</span>
                  <span style={{ color: '#00ff88' }}>${orderDetails.total_price.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}