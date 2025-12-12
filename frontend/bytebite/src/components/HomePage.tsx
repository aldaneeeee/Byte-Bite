import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, MapPin, Phone, ChefHat, Star, ShoppingBag, Plus, ShoppingCart } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState, useEffect } from 'react';
import { api, isAuthenticated } from '../utils/api';
import { useCart } from './CartContext';
import { toast } from 'sonner';
import { OrderDetailsModal } from './OrderDetailsModal';

// Home Page component - landing page for the restaurant website
export function HomePage() {
  const [recommendations, setRecommendations] = useState<any>(null);
  const [featuredChefs, setFeaturedChefs] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const { addToCart } = useCart();

  const handleAddToCart = (dish: any) => {
    const menuItem = {
      id: dish.id.toString(),
      name: dish.name,
      price: dish.price,
      image: dish.image || dish.image_url,
      description: dish.description,
      chef_name: dish.chef?.name,
      rating: dish.rating,
      is_vip: dish.is_vip
    };
    
    addToCart(menuItem);
    toast.success(`${dish.name} added to cart!`);
  };

  const handleOrderClick = (orderId: number) => {
    setSelectedOrderId(orderId);
    setOrderModalOpen(true);
  };

  const handleCloseOrderModal = () => {
    setOrderModalOpen(false);
    setSelectedOrderId(null);
  };

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        // Prepare API calls - always include getRecentOrders
        const apiCalls = [
          api.getRecommendations(),
          api.getFeaturedChefs(),
          api.getRecentOrders()
        ];

        const [recsResponse, chefsResponse, ordersResponse] = await Promise.all(apiCalls);
        
        if (recsResponse.success) {
          setRecommendations(recsResponse.recommendations);
        }
        if (chefsResponse.success) {
          setFeaturedChefs(chefsResponse.chefs);
        }
        if (ordersResponse.success) {
          setRecentOrders(ordersResponse.orders);
        }
      } catch (error) {
        console.error('Failed to load home data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadHomeData();
  }, []);

  return (
    <div>
      {/* Hero Section - Large banner image with welcome message */}
      <section className="relative h-[600px] overflow-hidden">
        {/* Background street food night image */}
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1558014356-9665ff525506?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjBmb29kJTIwbmlnaHR8ZW58MXx8fHwxNzYzNDU2MjQ0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Street Food at Night"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay to make text readable */}
        <div className="absolute inset-0 bg-[#0a1628]/70 flex items-center justify-center">
          <div className="text-center text-white px-4">
            {/* Main heading with neon green accent */}
            <h1 className="text-white mb-4">Welcome to <span className="text-[#00ff88]">Byte&Bite</span></h1>
            {/* Subheading with restaurant description */}
            <p className="text-xl mb-8 max-w-2xl mx-auto text-white/90">
              Street food meets tech culture. Fast, fresh, and futuristic bites for the digital generation
            </p>
            {/* Call-to-action buttons */}
            <div className="flex gap-4 justify-center flex-wrap">
              {/* Button to navigate to menu page */}
              <Link to="/menu">
                <Button size="lg" className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]">
                  View Menu
                </Button>
              </Link>
              {/* Order online button */}
              <Button size="lg" variant="outline" className="bg-transparent text-[#00ff88] border-[#00ff88] hover:bg-[#00ff88]/10">
                Order Online
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Personalized Recommendations Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="mb-4 text-white">
            {recommendations?.type === 'personalized' ? 'Your Favorites' : <>Top Rated <span className="text-[#00ff88]">Dishes</span></>}
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            {recommendations?.type === 'personalized' 
              ? 'Based on your order history and preferences'
              : 'Our highest rated dishes loved by customers'
            }
          </p>
        </div>
        
        {/* Most Ordered / Top Rated for general users */}
        <div className="mb-12">
          <h3 className="text-xl font-semibold text-white mb-6">
            {recommendations?.type === 'personalized' ? 'Your Most Ordered' : 'Most Popular Dishes'}
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="overflow-hidden bg-[#0f1f3a] border-[#00ff88]/20">
                  <div className="h-64 bg-[#00ff88]/10 animate-pulse"></div>
                  <div className="p-6">
                    <div className="h-6 bg-[#00ff88]/10 rounded mb-2 animate-pulse"></div>
                    <div className="h-4 bg-[#00ff88]/10 rounded animate-pulse"></div>
                  </div>
                </Card>
              ))
            ) : (recommendations?.type === 'personalized' ? recommendations.most_ordered : recommendations?.most_popular)?.map((dish: any) => (
              <Card key={dish.id} className="overflow-hidden hover:shadow-lg hover:shadow-[#00ff88]/20 transition-all bg-[#0f1f3a] border-[#00ff88]/20">
                <ImageWithFallback
                  src={dish.image}
                  alt={dish.name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white">{dish.name}</h3>
                    <div className="flex flex-col items-end gap-1">
                      {dish.order_count && (
                        <Badge className="bg-[#00ff88]/10 text-[#00ff88]">
                          Ordered {dish.order_count}x
                        </Badge>
                      )}
                      {dish.total_orders && (
                        <Badge className="bg-[#00ff88]/10 text-[#00ff88]">
                          {dish.total_orders} orders
                        </Badge>
                      )}
                      {dish.rating && (
                        <Badge className="bg-yellow-500/10 text-yellow-400">
                          ★ {dish.rating}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-white/70 mb-3">{dish.description}</p>
                  {dish.chef && (
                    <div className="flex items-center gap-2 mb-4">
                      <img
                        src={dish.chef.profile_image_url || '/default-chef.png'}
                        alt={dish.chef.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-white/60 text-sm">by {dish.chef.name}</span>
                    </div>
                  )}
                  {dish.rating && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(dish.rating)
                                ? 'text-yellow-400'
                                : 'text-gray-400'
                            }`}
                            fill={i < Math.floor(dish.rating) ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                      <span className="text-white/70 text-sm">({dish.rating})</span>
                    </div>
                  )}
                  <Button 
                    onClick={() => handleAddToCart(dish)}
                    className="w-full bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </Card>
            )) || (
              <div className="col-span-3 text-center py-8">
                <p className="text-white/70">No data available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Highest Rated / Top Rated */}
        <div className="mb-12">
          <h3 className="text-xl font-semibold text-white mb-6">
            {recommendations?.type === 'personalized' ? 'Your Highest Rated' : 'Top Rated Dishes'}
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="overflow-hidden bg-[#0f1f3a] border-[#00ff88]/20">
                  <div className="h-64 bg-[#00ff88]/10 animate-pulse"></div>
                  <div className="p-6">
                    <div className="h-6 bg-[#00ff88]/10 rounded mb-2 animate-pulse"></div>
                    <div className="h-4 bg-[#00ff88]/10 rounded animate-pulse"></div>
                  </div>
                </Card>
              ))
            ) : (recommendations?.type === 'personalized' ? recommendations.highest_rated : recommendations?.top_rated)?.map((dish: any) => (
              <Card key={dish.id} className="overflow-hidden hover:shadow-lg hover:shadow-[#00ff88]/20 transition-all bg-[#0f1f3a] border-[#00ff88]/20">
                <ImageWithFallback
                  src={dish.image}
                  alt={dish.name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white">{dish.name}</h3>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-white">{dish.rating}/5</span>
                    </div>
                  </div>
                  <p className="text-white/70 mb-3">{dish.description}</p>
                  {dish.review_count && (
                    <p className="text-white/60 text-sm mb-2">Based on {dish.review_count} reviews</p>
                  )}
                  {dish.chef && (
                    <div className="flex items-center gap-2 mb-4">
                      <img
                        src={dish.chef.profile_image_url || '/default-chef.png'}
                        alt={dish.chef.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-white/60 text-sm">by {dish.chef.name}</span>
                    </div>
                  )}
                  <Button 
                    onClick={() => handleAddToCart(dish)}
                    className="w-full bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </Card>
            )) || (
              <div className="col-span-3 text-center py-8">
                <p className="text-white/70">No ratings available yet</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Chefs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-[#0f1f3a]">
        <div className="text-center mb-12">
          <h2 className="mb-4 text-white">Meet Our <span className="text-[#00ff88]">Master Chefs</span></h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            Our talented chefs bring culinary innovation and street food expertise to every dish
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="overflow-hidden bg-[#1a2a3a] border-[#00ff88]/20">
                <div className="p-6 text-center">
                  <div className="w-20 h-20 bg-[#00ff88]/10 rounded-full mx-auto mb-4 animate-pulse"></div>
                  <div className="h-6 bg-[#00ff88]/10 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 bg-[#00ff88]/10 rounded mb-4 animate-pulse"></div>
                  <div className="h-4 bg-[#00ff88]/10 rounded animate-pulse"></div>
                </div>
              </Card>
            ))
          ) : featuredChefs.length > 0 ? (
            featuredChefs.map((chef) => (
              <Card key={chef.employee_id} className="overflow-hidden hover:shadow-lg hover:shadow-[#00ff88]/20 transition-all bg-[#1a2a3a] border-[#00ff88]/20">
                <div className="p-6 text-center">
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden">
                    {chef.profile_image_url ? (
                      <ImageWithFallback
                        src={chef.profile_image_url}
                        alt={chef.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#00ff88]/10 flex items-center justify-center">
                        <ChefHat className="w-10 h-10 text-[#00ff88]" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">{chef.name}</h3>
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {chef.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-white">{chef.rating}/5</span>
                      </div>
                    )}
                    <Badge variant="secondary" className="bg-[#00ff88]/10 text-[#00ff88]">
                      {chef.total_orders} orders
                    </Badge>
                  </div>
                  <p className="text-white/70 text-sm">
                    Reputation: {chef.reputation_score}/5
                  </p>
                </div>
              </Card>
            ))
          ) : (
            // Fallback when no chefs
            <div className="col-span-3 text-center py-8">
              <ChefHat className="w-16 h-16 text-[#00ff88]/50 mx-auto mb-4" />
              <p className="text-white/70">Our talented chefs will be featured here soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Recent Orders Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="mb-4 text-white">{isAuthenticated() ? 'Your Recent' : 'Recent'} <span className="text-[#00ff88]">Orders</span></h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            {isAuthenticated() ? 'Track your order history and see your recent purchases' : 'See what our customers are ordering'}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="p-6 bg-[#0f1f3a] border-[#00ff88]/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#00ff88]/10 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-[#00ff88]/10 rounded mb-1 animate-pulse"></div>
                    <div className="h-3 bg-[#00ff88]/10 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-[#00ff88]/10 rounded animate-pulse"></div>
                  <div className="h-4 bg-[#00ff88]/10 rounded animate-pulse"></div>
                </div>
              </Card>
            ))
          ) : recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <Card 
                key={order.order_id} 
                className="p-6 bg-[#0f1f3a] border-[#00ff88]/20 hover:border-[#00ff88]/40 transition-colors cursor-pointer"
                onClick={() => handleOrderClick(order.order_id)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#00ff88]/10 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-[#00ff88]" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Order #{order.order_id}</h4>
                    <p className="text-white/70 text-sm">
                      {isAuthenticated() ? 'Your Order' : order.customer_name}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/70">Status: {order.status}</span>
                  <span className="text-[#00ff88] font-medium">${order.total.toFixed(2)}</span>
                </div>
                {order.date && (
                  <p className="text-white/60 text-xs mt-2">
                    Ordered on {new Date(order.date).toLocaleDateString()}
                  </p>
                )}
              </Card>
            ))
          ) : (
            // Fallback when no orders
            <div className="col-span-3 text-center py-8">
              <ShoppingBag className="w-16 h-16 text-[#00ff88]/50 mx-auto mb-4" />
              <p className="text-white/70">
                {isAuthenticated() 
                  ? 'Your recent orders will appear here once you place them!' 
                  : 'No recent orders to display at the moment.'
                }
              </p>
            </div>
          )}
        </div>
      </section>

      {/* About Section - Restaurant story and image */}
      <section className="bg-[#0f1f3a] py-16 border-y border-[#00ff88]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Two-column layout: text on left, image on right */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-4 text-white">Our <span className="text-[#00ff88]">Story</span></h2>
              {/* Restaurant history and description */}
              <p className="text-white/70 mb-4">
                Since 2010, Byte&Bite has been serving exceptional street cuisine that brings the tech community together. 
                Our passion for bold flavors and innovative cooking techniques has made us a 
                beloved destination for foodies and techies alike.
              </p>
              <p className="text-white/70 mb-6">
                Every dish is crafted with care by our talented chefs, combining authentic street food recipes 
                with modern culinary artistry to create unforgettable eating experiences.
              </p>
              {/* Button to explore full menu */}
              <Link to="/menu">
                <Button className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]">
                  Explore Our Menu
                </Button>
              </Link>
            </div>
            {/* Taco truck image */}
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1519861155730-0b5fbf0dd889?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWNvJTIwdHJ1Y2t8ZW58MXx8fHwxNzYzNDY5NzA2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Taco Truck"
              className="w-full h-96 object-cover rounded-lg shadow-lg shadow-[#00ff88]/10"
            />
          </div>
        </div>
      </section>

      {/* Info Section - Hours, Location, and Contact information */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Three-column grid for restaurant info */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Opening Hours Card */}
          <Card className="p-6 text-center bg-[#0f1f3a] border-[#00ff88]/20 hover:border-[#00ff88]/40 transition-colors">
            <div className="w-12 h-12 bg-[#00ff88]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-[#00ff88]" />
            </div>
            <h3 className="mb-2 text-white">Opening Hours</h3>
            <p className="text-white/70">Mon - Fri: 11am - 10pm</p>
            <p className="text-white/70">Sat - Sun: 10am - 11pm</p>
          </Card>
          {/* Location Card */}
          <Card className="p-6 text-center bg-[#0f1f3a] border-[#00ff88]/20 hover:border-[#00ff88]/40 transition-colors">
            <div className="w-12 h-12 bg-[#00ff88]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-[#00ff88]" />
            </div>
            <h3 className="mb-2 text-white">Location</h3>
            <p className="text-white/70">123 Tech Avenue</p>
            <p className="text-white/70">San Francisco, CA 94103</p>
          </Card>
          {/* Contact Information Card */}
          <Card className="p-6 text-center bg-[#0f1f3a] border-[#00ff88]/20 hover:border-[#00ff88]/40 transition-colors">
            <div className="w-12 h-12 bg-[#00ff88]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6 text-[#00ff88]" />
            </div>
            <h3 className="mb-2 text-white">Contact Us</h3>
            <p className="text-white/70">(555) 123-4567</p>
            <p className="text-white/70">manager@byteandbite.com</p>
          </Card>
        </div>
      </section>

      <OrderDetailsModal
        orderId={selectedOrderId}
        isOpen={orderModalOpen}
        onClose={handleCloseOrderModal}
      />
    </div>
  );
}
