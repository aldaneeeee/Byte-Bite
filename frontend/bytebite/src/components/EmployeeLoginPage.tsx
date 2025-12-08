import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export function EmployeeLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.employeeLogin(email, password);
      console.log('Employee login response:', response);
      if (response.success) {
        console.log('Setting employee token:', response.token);
        // Clear any existing customer tokens when employee logs in
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.setItem('employeeToken', response.token);
        localStorage.setItem('employeeData', JSON.stringify(response.employee));
        console.log('Employee token set, navigating to:', response.employee.role);

        // Navigate based on role
        switch (response.employee.role) {
          case 'Manager':
            navigate('/employee/manager');
            break;
          case 'Chef':
            navigate('/employee/chef');
            break;
          case 'Delivery':
            navigate('/employee/delivery');
            break;
          default:
            navigate('/employee/dashboard');
        }
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 bg-[#0f1f3a] border-[#00ff88]/20">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Employee Login</h1>
          <p className="text-white/70">Access your employee dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#1a2a3a] border-[#00ff88]/30 text-white placeholder:text-white/50"
              placeholder="employee@bytebite.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-white">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#1a2a3a] border-[#00ff88]/30 text-white placeholder:text-white/50"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628] font-semibold"
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={() => navigate('/')}
            className="text-[#00ff88] hover:text-[#00dd77]"
          >
            Back to Customer Login
          </Button>
        </div>

        <div className="mt-4 p-4 bg-[#1a2a3a] rounded-lg">
          <h3 className="text-white font-semibold mb-2">Demo Accounts:</h3>
          <div className="text-sm text-white/70 space-y-1">
            <div>Manager: manager@bytebite.com / manager123</div>
            <div>Chef: chef1@bytebite.com / chef123</div>
            <div>Delivery: delivery1@bytebite.com / delivery123</div>
          </div>
        </div>
      </Card>
    </div>
  );
}