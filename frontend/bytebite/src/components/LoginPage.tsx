import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { useNavigate, useLocation } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { api } from '../utils/api';

// Login Page component - handles user login and signup
export function LoginPage() {
  // Track whether showing login or signup form
  const [isLogin, setIsLogin] = useState(true);
  // Track form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Navigation hook for redirecting after login
  const navigate = useNavigate();
  // Get location to check if user came from checkout
  const location = useLocation();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login mode
        const response = await api.login({ email, password });
        if (response.success && response.token) {
          // Token is automatically saved by api.login()
          // Check if user came from checkout page
          const from = (location.state as any)?.from || '/';
          navigate(from);
        } else {
          setError(response.message || 'Login failed');
        }
      } else {
        // Signup mode
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        if (!phoneNumber.trim()) {
          setError('Phone number is required');
          return;
        }
        const response = await api.register({
          username: name,
          email,
          password,
          phone_number: phoneNumber,
        });
        if (response.success) {
          // Switch to login form after successful registration
          setIsLogin(true);
          setName('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setError('Account created! Please log in.');
        } else {
          setError(response.message || 'Registration failed');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Two-column layout: form on left, image on right
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      {/* Form Section - Left side */}
      <div className="flex items-center justify-center p-8 bg-[#0a1628]">
        <Card className="w-full max-w-md p-8 bg-[#0f1f3a] border-[#00ff88]/20">
          {/* Header - changes based on login/signup mode */}
          <div className="text-center mb-8">
            <h1 className="mb-2 text-white">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="text-white/70">
              {isLogin
                ? 'Sign in to access your account'
                : 'Join the Byte&Bite community'}
            </p>
          </div>

          {/* Login/Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/50 text-red-200 rounded text-sm">
                {error}
              </div>
            )}

            {/* Name field - only shown during signup */}
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white/90">Username</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="text-white/90">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    placeholder="555-123-4567"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
                  />
                </div>
              </>
            )}

            {/* Email field - shown for both login and signup */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
              />
            </div>

            {/* Password field - shown for both login and signup */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
              />
            </div>

            {/* Confirm Password field - only shown during signup */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-white/90">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
                />
              </div>
            )}

            {/* Forgot password link - only shown during login */}
            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-[#00ff88] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit button - text changes based on login/signup mode */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628] disabled:opacity-50"
            >
              {loading ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          {/* Divider between form and social login buttons */}
          <div className="relative my-6">
            <Separator className="bg-[#00ff88]/20" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f1f3a] px-2 text-sm text-white/50">
              OR
            </span>
          </div>

          {/* Social Login Buttons */}
          
    
          {/* Toggle between login and signup modes */}
          <div className="text-center mt-6">
            <p className="text-sm text-white/70">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#00ff88] hover:underline"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </Card>
      </div>

      {/* Image Section - Right side, hidden on mobile */}
      <div className="hidden lg:block relative">
        {/* Background street food night image */}
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1558014356-9665ff525506?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjBmb29kJTIwbmlnaHR8ZW58MXx8fHwxNzYzNDU2MjQ0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Street Food"
          className="w-full h-full object-cover"
        />
        {/* Dark gradient overlay with text */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/90 to-transparent flex items-end">
          <div className="p-12 text-white">
            <h2 className="text-white mb-4">Join <span className="text-[#00ff88]">Byte&Bite</span> Today</h2>
            <p className="text-lg text-white/80">
              Experience bold street food flavors and enjoy exclusive member perks in our tech-savvy community
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}