import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { api, UserProfile, UpdateProfilePayload } from '../utils/api';
import { LogOut, Edit2, Check, X, CreditCard } from 'lucide-react';

// Profile Page component - displays and allows editing of user profile
export function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state for editing
  const [formData, setFormData] = useState({
    deposited_cash: 0,
  });
  const [saving, setSaving] = useState(false);

  // Load profile on mount
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate('/login');
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getProfile();
        if (response.success && response.user) {
          setProfile(response.user);
          setFormData({
            deposited_cash: response.user.deposited_cash || 0,
          });
        }
      } catch (err) {
        setError((err as any).message || 'Failed to load profile');
        console.error('Profile load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate, location.pathname + location.search]);

  // Re-fetch profile when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        const loadProfile = async () => {
          try {
            const response = await api.getProfile();
            if (response.success && response.user) {
              setProfile(response.user);
              setFormData({
                deposited_cash: response.user.deposited_cash || 0,
              });
            }
          } catch (err) {
            console.error('Profile refetch error:', err);
          }
        };
        loadProfile();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'deposited_cash' ? parseFloat(value) || 0 : value,
    }));
  }

  // Save profile changes
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await api.updateProfile(formData as UpdateProfilePayload);
      if (response.success && response.user) {
        setProfile(response.user);
        setIsEditing(false);
      } else {
        setError(response.message || 'Failed to update profile');
      }
    } catch (err) {
      setError((err as any).message || 'Failed to save profile');
      console.error('Profile save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    api.logout();
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#0a1628]">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  // Show error state
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

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0a1628] py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Profile Header */}
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

        {/* Error message if any */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Profile Card */}
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
              {/* Username (read-only) */}
              <div>
                <Label className="text-white/70 text-sm">Username</Label>
                <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-[#00ff88]/10">
                  <p className="text-white font-medium">{profile.username}</p>
                </div>
              </div>

              {/* Phone Number (read-only) */}
              <div>
                <Label className="text-white/70 text-sm">Phone Number</Label>
                <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-[#00ff88]/10">
                  <p className="text-white font-medium">{profile.phone_number}</p>
                </div>
              </div>
              {/* Email (read-only) */}
              <div>
                <Label className="text-white/70 text-sm">Email Address</Label>
                <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-[#00ff88]/10">
                  <p className="text-white font-medium">{profile.email}</p>
                </div>
              </div>

              <Separator className="bg-[#00ff88]/20" />

              {/* Editable Fields */}


              
              {/* Deposited Cash */}
              <div>
                <Label htmlFor="deposited_cash" className="text-white/70 text-sm">Deposited Cash Balance</Label>
                <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-[#00ff88]/10">
                  <p className="text-[#00ff88] font-bold text-lg">${formData.deposited_cash.toFixed(2)}</p>
                </div>
              </div>

              {/* Warning Count (read-only) */}
              <div>
                <Label className="text-white/70 text-sm">Warning Count</Label>
                <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-red-500/20">
                  <p className="text-red-400 font-bold text-lg">{profile.warning_count ?? 0}</p>
                </div>
              </div>

              {/* Order Count (read-only) */}
              <div>
                <Label className="text-white/70 text-sm">Total Orders</Label>
                <div className="mt-2 p-3 bg-[#0a1628] rounded-lg border border-[#00ff88]/10">
                  <p className="text-[#00ff88] font-bold text-lg">{profile.order_count ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
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

        </Card>
      </div>
    </div>
  );
}
