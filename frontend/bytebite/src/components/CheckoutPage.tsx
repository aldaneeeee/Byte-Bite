import { useCart } from './CartContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Minus, Plus, Trash2, ShoppingBag, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState, useEffect } from 'react';
import { api } from '../utils/api';

// Checkout Page component - shows cart items, order summary, and delivery form
export function CheckoutPage() {
  const { cart, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
  });

  const isLoggedIn = !!localStorage.getItem('authToken');
  const navigate = useNavigate();
  const totalPrice = getTotalPrice();

  // Load profile for autofill
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.getProfile();
        if (response.success && response.user) {
          setFormData(f => ({
            ...f,
            name: response.user.username || '',
            email: response.user.email || '',
            phone: response.user.phone_number || '',
            // Note: If user profile doesn't have address/city/zip, these remain empty
            // You might want to add these fields to the UserProfile model later
          }));
        }
      } catch {}
    };
    if (isLoggedIn) loadProfile();
  }, [isLoggedIn]);

  // Handle form submission
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault(); 

    // 1. Calculate Totals
    const subtotal = getTotalPrice();
    const tax = subtotal * 0.1;
    const delivery = 5;
    const total = subtotal + tax + delivery;

    // 2. Validate Inputs (Simple check)
    if (!formData.address || !formData.city || !formData.zip) {
        alert("Please fill in all address fields.");
        return;
    }

    // 3. Prepare Payload
    const orderPayload = {
      items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
      deliveryInfo: {
        address: formData.address,
        city: formData.city,
        zip: formData.zip,
        phone: formData.phone,
        name: formData.name
      },
      totalPrice: total
    };

    console.log("Submitting Order Payload:", orderPayload); // <--- DEBUG HERE

    try {
      const response = await api.createOrder(orderPayload);
      if (response.success) {
        setOrderPlaced(true);
        clearCart();
        // Refresh profile (optional, mainly for balance update)
        try {
            await api.getProfile();
        } catch {}
      } else {
        alert(response.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order placement error:', error);
      alert('Insufficient balance. A warning has been added to your account');
    }
  };

  // ... (Render Logic: Success Message, Empty Cart, Login Prompt - SAME AS BEFORE) ...

  if (orderPlaced) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="max-w-md mx-auto p-8 text-center bg-[#0f1f3a] border-[#00ff88]/20">
          <div className="w-16 h-16 bg-[#00ff88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-[#00ff88]" />
          </div>
          <h2 className="mb-4 text-white">Order Placed Successfully!</h2>
          <p className="text-white/70 mb-4">
            Thank you for your order. Your food will be prepared and delivered soon.
          </p>
          <Link to="/">
             <Button className="bg-[#00ff88] text-[#0a1628]">Return Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="max-w-md mx-auto p-8 text-center bg-[#0f1f3a] border-[#00ff88]/20">
          <ShoppingBag className="w-16 h-16 text-[#00ff88]/30 mx-auto mb-4" />
          <h2 className="mb-4 text-white">Your Cart is Empty</h2>
          <Link to="/menu">
            <Button className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]">Browse Menu</Button>
          </Link>
        </Card>
      </div>
    );
  }
  
  if (!isLoggedIn) {
    return (
        // ... (Keep existing login prompt logic) ...
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
             <Card className="max-w-md mx-auto p-8 text-center bg-[#0f1f3a] border-[#00ff88]/20">
                 <h2 className="text-white mb-4">Please Login</h2>
                 <Link to="/login" state={{ from: '/checkout' }}>
                     <Button className="bg-[#00ff88] text-[#0a1628]">Login to Checkout</Button>
                 </Link>
             </Card>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="mb-8 text-white">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items Section */}
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

        {/* Order Summary & Form Section */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24 bg-[#0f1f3a] border-[#00ff88]/20">
            <h2 className="mb-4 text-white">Order Summary</h2>
            
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

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <h3 className="mb-4 text-white">Delivery Info</h3>
              
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

              {/* City and ZIP Code fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-white/90">City</Label>
                  <Input 
                    id="city" 
                    placeholder="San Francisco" 
                    required 
                    value={formData.city} // 👈 Added binding
                    onChange={e => setFormData(f => ({ ...f, city: e.target.value }))} // 👈 Added handler
                    className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip" className="text-white/90">ZIP Code</Label>
                  <Input 
                    id="zip" 
                    placeholder="94103" 
                    required 
                    value={formData.zip} // 👈 Added binding
                    onChange={e => setFormData(f => ({ ...f, zip: e.target.value }))} // 👈 Added handler
                    className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40" 
                  />
                </div>
              </div>

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