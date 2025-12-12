import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { useCart, MenuItem } from './CartContext';
import { ShoppingCart, Check, Camera, Search } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { api, UserProfile, isAuthenticated } from '../utils/api';
import { ImageSearchModal } from './ImageSearchModal';

// Menu Page component
export function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart, cart } = useCart();
  // Track items that were just added (for showing "Added!" feedback)
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  // Track currently selected category filter
  const [selectedCategory, setSelectedCategory] = useState('All');
  // Search term state
  const [searchTerm, setSearchTerm] = useState('');
  // State for Image Search Modal
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  // User profile and login state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Available filter categories
  const categories = ['All', 'Street Bites', 'Main Bowls', 'Snacks'];

  // Load menu items on mount
  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await api.getMenu();
        setMenuItems(items);
      } catch (err) {
        setError((err as any).message || 'Failed to load menu');
        console.error('Menu load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMenu();
  }, []);

  // Load user profile if authenticated
  useEffect(() => {
    const loadProfile = async () => {
      if (isAuthenticated()) {
        try {
          const response = await api.getProfile();
          if (response.success && response.user) {
            setUserProfile(response.user);
            setIsLoggedIn(true);
          }
        } catch (err) {
          console.error('Profile load error:', err);
        }
      }
    };
    loadProfile();
  }, []);

  // Function to add item to cart and show temporary success feedback
  const handleAddToCart = (item: MenuItem) => {
    addToCart(item); // Add to cart
    // Add item to "just added" set
    setAddedItems(new Set(addedItems).add(item.id));
    // Remove from "just added" set after 2 seconds
    setTimeout(() => {
      setAddedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }, 2000);
  };

  // Check if an item is currently in the cart
  const isInCart = (itemId: string) => {
    return cart.some((cartItem) => cartItem.id === itemId);
  };

  // Filter menu items based on selected category and search term
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'All' ||
      (selectedCategory === 'Street Bites' && ['1', '2'].includes(item.id)) ||
      (selectedCategory === 'Main Bowls' && ['3', '4', '5', '6'].includes(item.id)) ||
      (selectedCategory === 'Snacks' && ['7', '8'].includes(item.id));
    
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-white">Loading menu...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="mb-4 text-white">Our <span className="text-[#00ff88]">Menu</span></h1>
        <p className="text-white/70 max-w-2xl mx-auto">
          Street food classics reimagined for the tech generation. Bold flavors, fresh ingredients
        </p>
      </div>

      {/* Category Filter & AI Search Buttons */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
        {/* Search Bar - Only visible to VIP customers */}
        {isLoggedIn && userProfile?.is_vip && (
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40 focus:border-[#00ff88] focus:ring-[#00ff88]/20"
            />
          </div>
        )}
        
        <div className="flex gap-2 flex-wrap justify-center">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category ? 'bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]' : 'border-[#00ff88]/30 text-white/80 hover:bg-[#00ff88]/10 hover:text-[#00ff88]'}
            >
              {category}
            </Button>
          ))}
        </div>
        
        {/* AI Image Search Button - Only visible to logged-in customers */}
        {isLoggedIn && (
          <Button 
              onClick={() => setIsImageSearchOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap shadow-lg hover:shadow-purple-500/20"
          >
              <Camera className="w-4 h-4 mr-2" /> AI Food Search
          </Button>
        )}
      </div>

      {/* Menu Grid - displays filtered items */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg hover:shadow-[#00ff88]/20 transition-all bg-[#0f1f3a] border-[#00ff88]/20">
            <div className="relative">
              {/* Item image */}
              <ImageWithFallback
                src={item.image}
                alt={item.name}
                className="w-full h-64 object-cover"
              />
              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {item.is_vip && (
                  <Badge className="bg-purple-600 text-white">
                    VIP Only
                  </Badge>
                )}
              </div>
              {isInCart(item.id) && (
                <Badge className="absolute top-4 right-4 bg-[#00ff88] text-[#0a1628]">
                  In Cart
                </Badge>
              )}
            </div>
            <div className="p-6">
              {/* Item name and price */}
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white">{item.name}</h3>
                <span className="text-[#00ff88]">${item.price}</span>
              </div>
              {/* Item description with chef and rating info */}
              <div className="mb-4">
                <p className="text-white/70 mb-2">{item.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  {item.chef_name && (
                    <span className="text-[#00ff88]/80">
                      👨‍🍳 Chef: {item.chef_name} 
                    </span>
                  )}
                  {item.rating && (
                    <span className="text-yellow-400">
                      ⭐ {item.rating}/5
                    </span>
                  )}
                </div>
              </div>
              {/* Add to cart button */}
              <Button
                onClick={() => handleAddToCart(item)}
                className="w-full bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]"
                disabled={addedItems.has(item.id)} // Disable while showing "Added!" message
              >
                {/* Show different content based on whether item was just added */}
                {addedItems.has(item.id) ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Added!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Image Search Modal */}
      <ImageSearchModal 
        isOpen={isImageSearchOpen} 
        onClose={() => setIsImageSearchOpen(false)} 
      />
    </div>
  );
}