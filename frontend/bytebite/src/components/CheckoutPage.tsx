import { useCart } from './CartContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Minus, Plus, Trash2, ShoppingBag, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';
import { useEffect } from 'react';
import { api } from '../utils/api';

// Checkout Page component - shows cart items, order summary, and delivery form
export function CheckoutPage() {
  // Get cart data and functions from context
  const { cart, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();
  // Track whether order has been placed
  const [orderPlaced, setOrderPlaced] = useState(false);
  // Profile state for autofill
  const [profile, setProfile] = useState(null);
  // Delivery form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
  });

  // Check if user is logged in
  const isLoggedIn = !!localStorage.getItem('authToken');

  // Load profile for autofill
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.getProfile();
        if (response.success && response.user) {
          setProfile(response.user);
          setFormData(f => ({
            ...f,
            name: response.user.username || '',
            email: response.user.email || '',
            phone: response.user.phone_number || '',
            address: response.user.address || '',
          }));
        }
      } catch {}
    };
    if (isLoggedIn) loadProfile();
  }, [isLoggedIn]);
  // Navigation hook for redirecting after order
  const navigate = useNavigate();
  // Calculate total price of cart items
  const totalPrice = getTotalPrice();
  
  // ...existing code...

  // Handle form submission when placing order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page reload

    // Calculate total price including tax and delivery
    const subtotal = getTotalPrice();
    const tax = subtotal * 0.1;
    const delivery = 5;
    const total = subtotal + tax + delivery;

    // Prepare order payload
    const orderPayload = {
      items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
      deliveryInfo: {
        // Add delivery info from form if needed
      },
      totalPrice: total
    };

    try {
      const response = await api.createOrder(orderPayload);
      if (response.success) {
        setOrderPlaced(true); // Show success message
        clearCart(); // Empty the cart
        // Refresh profile after order
        try {
          const profileResponse = await api.getProfile();
          if (profileResponse.success && profileResponse.user) {
            localStorage.setItem('user', JSON.stringify(profileResponse.user));
          }
        } catch {}
      } else {
        alert(response.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order placement error:', error);
      alert('Insufficient balance. A warning has been added to your account');
    }
  };

  // Show success message after order is placed
  if (orderPlaced) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="max-w-md mx-auto p-8 text-center bg-[#0f1f3a] border-[#00ff88]/20">
          {/* Success icon */}
          <div className="w-16 h-16 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-[#00ff88]" />
          </div>
          <h2 className="mb-4 text-white">Order Placed Successfully!</h2>
          <p className="text-white/70 mb-4">
            Thank you for your order. Your food will be prepared and delivered soon.
          </p>
        </Card>
      </div>
    );
  }

  // Show empty cart message if no items in cart
  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="max-w-md mx-auto p-8 text-center bg-[#0f1f3a] border-[#00ff88]/20">
          {/* Empty cart icon */}
          <ShoppingBag className="w-16 h-16 text-[#00ff88]/30 mx-auto mb-4" />
          <h2 className="mb-4 text-white">Your Cart is Empty</h2>
          <p className="text-white/70 mb-6">
            Add some delicious items from our menu to get started
          </p>
          {/* Button to go to menu page */}
          <Link to="/menu">
            <Button className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]">
              Browse Menu
            </Button>
          </Link>
        </Card>
      </div>
    );
  }
  
  // Show login prompt if user is not logged in
  if (!isLoggedIn) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="mb-8 text-white">Checkout</h1>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items Section - shows items but read-only */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="mb-4 text-white">Your Order</h2>
            {cart.map((item) => (
              <Card key={item.id} className="p-4 bg-[#0f1f3a] border-[#00ff88]/20">
                <div className="flex gap-4">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-white">{item.name}</h3>
                        <p className="text-white/60 text-sm">{item.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-white">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="text-[#00ff88]">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Login Prompt Section */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24 bg-[#0f1f3a] border-[#00ff88]/20">
              <h2 className="mb-4 text-white">Order Summary</h2>
              
              {/* Price breakdown */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-white/70">
                  <span>Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Delivery Fee</span>
                  <span>$5.00</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Tax</span>
                  <span>${(totalPrice * 0.1).toFixed(2)}</span>
                </div>
                <Separator className="my-2 bg-[#00ff88]/20" />
                <div className="flex justify-between">
                  <span className="text-white">Total</span>
                  <span className="text-[#00ff88]">
                    ${(totalPrice + 5 + totalPrice * 0.1).toFixed(2)}
                  </span>
                </div>
              </div>

              <Separator className="my-6 bg-[#00ff88]/20" />

              {/* Login Required Message */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto">
                  <LogIn className="w-8 h-8 text-[#00ff88]" />
                </div>
                <h3 className="text-white">Sign In Required</h3>
                <p className="text-white/70 text-sm">
                  Please sign in to your account to complete your order
                </p>
                <Link to="/login" state={{ from: '/checkout' }} className="block">
                  <Button className="w-full bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In to Continue
                  </Button>
                </Link>
                <p className="text-white/50 text-xs">
                  Don&apos;t have an account? You can create one on the login page.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main checkout page with cart items and order form
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="mb-8 text-white">Checkout</h1>

      {/* Two-column layout: cart items on left, summary/form on right */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items Section - takes 2/3 of the width */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="mb-4 text-white">Your Order</h2>
          {/* Loop through each cart item */}
          {cart.map((item) => (
            <Card key={item.id} className="p-4 bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="flex gap-4">
                {/* Item image */}
                <ImageWithFallback
                  src={item.image}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      {/* Item name */}
                      <h3 className="text-white">{item.name}</h3>
                      {/* Item description */}
                      <p className="text-white/60 text-sm">{item.description}</p>
                    </div>
                    {/* Delete button to remove item from cart */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    {/* Quantity controls */}
                    <div className="flex items-center gap-2">
                      {/* Decrease quantity button */}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      {/* Current quantity display */}
                      <span className="w-8 text-center text-white">{item.quantity}</span>
                      {/* Increase quantity button */}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    {/* Total price for this item (price × quantity) */}
                    <span className="text-[#00ff88]">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Order Summary & Form Section - takes 1/3 of the width */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24 bg-[#0f1f3a] border-[#00ff88]/20">
            <h2 className="mb-4 text-white">Order Summary</h2>
            
            {/* Price breakdown */}
            <div className="space-y-2 mb-4">
              {/* Subtotal (sum of all items) */}
              <div className="flex justify-between text-white/70">
                <span>Subtotal</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              {/* Fixed delivery fee */}
              <div className="flex justify-between text-white/70">
                <span>Delivery Fee</span>
                <span>$5.00</span>
              </div>
              {/* Tax (10% of subtotal) */}
              <div className="flex justify-between text-white/70">
                <span>Tax</span>
                <span>${(totalPrice * 0.1).toFixed(2)}</span>
              </div>
              <Separator className="my-2 bg-[#00ff88]/20" />
              {/* Final total (subtotal + delivery + tax) */}
              <div className="flex justify-between">
                <span className="text-white">Total</span>
                <span className="text-[#00ff88]">
                  ${(totalPrice + 5 + totalPrice * 0.1).toFixed(2)}
                </span>
              </div>
            </div>

            <Separator className="my-6 bg-[#00ff88]/20" />

            {/* Delivery Information Form */}
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <h3 className="mb-4 text-white">Delivery Info</h3>
              
              {/* Full Name field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/90">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  required
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
                />
              </div>

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
                />
              </div>

              {/* Phone Number field */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white/90">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  required
                  value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                  className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
                />
              </div>

              {/* Delivery Address field */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-white/90">Delivery Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main St"
                  required
                  value={formData.address}
                  onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
                  className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
                />
              </div>

              {/* City and ZIP Code fields side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-white/90">City</Label>
                  <Input id="city" placeholder="San Francisco" required className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip" className="text-white/90">ZIP Code</Label>
                  <Input id="zip" placeholder="94103" required className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40" />
                </div>
              </div>

              {/* Submit button - places the order */}
              <Button type="submit" className="w-full bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]">
                Place Order - ${(totalPrice + 5 + totalPrice * 0.1).toFixed(2)}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}