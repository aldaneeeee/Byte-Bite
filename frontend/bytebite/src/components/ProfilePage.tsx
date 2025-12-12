import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { api, UserProfile, UpdateProfilePayload } from '../utils/api';
import { LogOut, Edit2, Check, X, CreditCard, Star } from 'lucide-react';
import { ReviewModal } from './ReviewModal';
import { OrderDetailsModal } from './OrderDetailsModal';

// Interface for Order data fetched from backend
interface Order {
  order_id: number;
  date: string;
  total: number;
  status: string;
  has_review: boolean;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]); // Store real orders here
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    deposited_cash: 0,
  });
  const [saving, setSaving] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  // Load profile and orders on mount
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate('/login');
      return;
    }
    loadData();
  }, [navigate, location.pathname]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch Profile and Orders in parallel
      const [profileRes, ordersRes] = await Promise.all([
        api.getProfile(),
        api.getOrders()
      ]);

      // Handle Profile Data
      if (profileRes.success && profileRes.user) {
        setProfile(profileRes.user);
        setFormData({
          username: profileRes.user.username || '',
          email: profileRes.user.email || '',
          phone_number: profileRes.user.phone_number || '',
          deposited_cash: profileRes.user.deposited_cash || 0,
        });
      }

      // Handle Orders Data
      if (ordersRes.success) {
        setOrders(ordersRes.orders);
      }

    } catch (err) {
      setError((err as any).message || 'Failed to load data');
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch data when window gains focus (e.g. switching back from another tab)
  useEffect(() => {
    const handleFocus = () => {
      const authToken = localStorage.getItem('authToken');
      if (authToken) loadData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'deposited_cash' ? parseFloat(value) || 0 : value,
    }));
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Don't include deposited_cash in the update since it's not editable
      const { deposited_cash, ...updateData } = formData;
      
      const response = await api.updateProfile(updateData as UpdateProfilePayload);
      if (response.success && response.user) {
        setProfile(response.user);
        setIsEditing(false);
      } else {
        setError(response.message || 'Failed to update profile');
      }
    } catch (err) {
      setError((err as any).message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  const handleOrderClick = (orderId: number) => {
    setSelectedOrderId(orderId);
    setOrderModalOpen(true);
  };

  const handleCloseOrderModal = () => {
    setOrderModalOpen(false);
    setSelectedOrderId(null);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#0a1628]">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#0a1628]">
        <Card className="p-8 bg-[#0f1f3a] border-[#00ff88]/20 max-w-md w-full mx-4">
          <h2 className="text-white text-xl mb-4">Error Loading Profile</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <Button 
            onClick={() => navigate('/login')}
            className="w-full bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]"
          >
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0a1628] py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
          <div className="flex gap-4">
            <Button
              onClick={() => navigate('/add-funds')}
              className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Add Funds
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-[#00ff88]/30 text-white hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <Card className="bg-[#0f1f3a] border-[#00ff88]/20 p-8">
          {/* Account Info Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Account Information</h2>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="ghost"
                  className="text-[#00ff88] hover:bg-[#00ff88]/10"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="username" className="text-white/70 text-sm">Username</Label>
                {isEditing ? (
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="mt-2 bg-[#0a1628] border-[#00ff88]/30 text-white focus:border-[#00ff88]"
                  />
                ) : (
                  <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-[#00ff88]/10">
                    <p className="text-white font-medium">{profile.username}</p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="phone_number" className="text-white/70 text-sm">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="mt-2 bg-[#0a1628] border-[#00ff88]/30 text-white focus:border-[#00ff88]"
                  />
                ) : (
                  <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-[#00ff88]/10">
                    <p className="text-white font-medium">{profile.phone_number}</p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="text-white/70 text-sm">Email Address</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-2 bg-[#0a1628] border-[#00ff88]/30 text-white focus:border-[#00ff88]"
                  />
                ) : (
                  <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-[#00ff88]/10">
                    <p className="text-white font-medium">{profile.email}</p>
                  </div>
                )}
              </div>

              <Separator className="bg-[#00ff88]/20" />

              <div>
                <Label htmlFor="deposited_cash" className="text-white/70 text-sm">Deposited Cash Balance</Label>
                {isEditing ? (
                  <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-[#00ff88]/10">
                    <p className="text-[#00ff88] font-bold text-lg">${formData.deposited_cash.toFixed(2)}</p>
                    <p className="text-white/50 text-xs mt-1">Use "Add Funds" to modify balance</p>
                  </div>
                ) : (
                  <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-[#00ff88]/10">
                    <p className="text-[#00ff88] font-bold text-lg">${formData.deposited_cash.toFixed(2)}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-white/70 text-sm">Warning Count</Label>
                <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-red-500/20">
                  <p className="text-red-400 font-bold text-lg">{profile.warning_count ?? 0}</p>
                </div>
              </div>

              <div>
                <Label className="text-white/70 text-sm">Total Orders</Label>
                <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-[#00ff88]/10">
                  <p className="text-[#00ff88] font-bold text-lg">{profile.order_count ?? 0}</p>
                </div>
              </div>

              <div>
                <Label className="text-white/70 text-sm">VIP Status</Label>
                <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-[#00ff88]/10">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{profile.is_vip ? '⭐' : '☆'}</span>
                    <p className={`font-bold text-lg ${profile.is_vip ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {profile.is_vip ? 'VIP Member' : 'Regular Member'}
                    </p>
                  </div>
                  {profile.is_vip && (
                    <div className="text-yellow-400/70 text-sm mt-1">
                      <p>Enjoy exclusive benefits and priority service</p>
                      <p>Order count: {profile.order_count || 0}</p>
                    </div>
                  )}
                  {!profile.is_vip && (
                    <p className="text-gray-400 text-sm mt-1">
                      Make 3 orders or spend $100+ to become VIP
                    </p>
                  )}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="mt-8 flex gap-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628] font-semibold disabled:opacity-50"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="flex-1 border-[#00ff88]/30 text-white hover:bg-[#1a2f4a]"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <Separator className="my-8 bg-[#00ff88]/20" />
  
          {/* Order History Section */}
          <h2 className="text-xl font-semibold text-white mb-4">Order History</h2>
          
          <div className="space-y-4">
            {orders.length === 0 && (
              <p className="text-white/50 text-center py-4">No orders yet.</p>
            )}

            {orders.map((order) => (
              <div 
                key={order.order_id} 
                className="bg-[#1a2f4a] p-4 rounded-lg flex justify-between items-center border border-[#00ff88]/10 cursor-pointer hover:border-[#00ff88]/30 transition-colors"
                onClick={() => handleOrderClick(order.order_id)}
              >
                <div>
                  <p className="text-white font-medium">Order #{order.order_id}</p>
                  <p className="text-white/50 text-sm">{order.date} • ${order.total.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm px-2 py-1 rounded ${
                    order.status === 'Delivered' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {order.status}
                  </span>
                  
                  {/* Logic: Only show Rate button if Delivered AND not rated yet */}
                  {order.status === 'Delivered' && !order.has_review && (
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowReviewModal(order.order_id);
                      }}
                      className="bg-[#00ff88] text-[#0a1628] hover:bg-[#00dd77]"
                    >
                      Rate
                    </Button>
                  )}

                  {/* Show Pending text if order is not yet delivered */}
                  {order.status !== 'Delivered' && !order.has_review && (
                     <span className="text-white/30 text-sm">
                       Pending
                     </span>
                  )}

                  {/* Logic: Show Rated badge if already rated */}
                  {order.has_review && (
                     <span className="text-yellow-400 text-sm flex items-center bg-yellow-400/10 px-2 py-1 rounded">
                       <Star className="w-3 h-3 mr-1 fill-yellow-400" /> Rated
                     </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Review Modal */}
          {showReviewModal && (
            <ReviewModal 
              orderId={showReviewModal} 
              onClose={() => setShowReviewModal(null)}
              onSuccess={() => {
                alert('Review Submitted Successfully!');
                loadData(); // Refresh orders to update the button to "Rated"
                setShowReviewModal(null);
              }}
            />
          )}

        </Card>
      </div>

      <OrderDetailsModal
        orderId={selectedOrderId}
        isOpen={orderModalOpen}
        onClose={handleCloseOrderModal}
      />
    </div>
  );
}