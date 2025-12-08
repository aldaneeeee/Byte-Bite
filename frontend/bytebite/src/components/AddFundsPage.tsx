import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { api } from '../utils/api';

export function AddFundsPage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.getProfile();
        if (response.success && response.user) {
          setCurrentBalance(response.user.deposited_cash || 0);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };
    loadProfile();
  }, []);

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.updateProfile({ deposited_cash: numAmount });
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/profile?refresh=' + Date.now());
        }, 2000);
      } else {
        setError(response.message || 'Failed to add funds');
      }
    } catch (err) {
      setError('An error occurred while adding funds');
      console.error('Add funds error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#0a1628]">
        <Card className="p-8 bg-[#0f1f3a] border-[#00ff88]/20 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-[#00ff88]" />
          </div>
          <h2 className="text-white text-xl mb-4">Funds Added Successfully!</h2>
          <p className="text-white/70 mb-6">
            Your deposited cash has been updated. Redirecting to profile...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0a1628] py-8">
      <div className="max-w-md mx-auto px-4">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            onClick={() => navigate('/profile')}
            variant="ghost"
            className="text-white hover:bg-[#1a2f4a] mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-2xl font-bold text-white">Add Funds</h1>
        </div>

        {/* Add Funds Card */}
        <Card className="bg-[#0f1f3a] border-[#00ff88]/20 p-8">
          <div className="w-16 h-16 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-8 h-8 text-[#00ff88]" />
          </div>

          <h2 className="text-white text-xl text-center mb-6">Add Funds to Your Account</h2>

          <div className="mb-6 p-4 bg-[#1a2f4a] rounded-lg">
            <p className="text-white/70 text-sm">Current Balance</p>
            <p className="text-[#00ff88] text-2xl font-bold">${currentBalance.toFixed(2)}</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleAddFunds} className="space-y-6">
            <div>
              <Label htmlFor="amount" className="text-white/90">Amount to Add ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
                className="mt-2 bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628] font-semibold disabled:opacity-50"
            >
              {loading ? 'Adding Funds...' : 'Add Funds'}
            </Button>
          </form>

          <p className="text-white/50 text-sm text-center mt-6">
            Note: This is a demo. In a real app, this would integrate with a payment processor.
          </p>
        </Card>
      </div>
    </div>
  );
}