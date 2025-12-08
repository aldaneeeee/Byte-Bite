import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Clock, MapPin, Phone } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

// Home Page component - landing page for the restaurant website
export function HomePage() {
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

      {/* Featured Dishes Section - Shows 3 popular menu items */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="mb-4 text-white">Featured <span className="text-[#00ff88]">Street Eats</span></h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            Our most popular street-style dishes, crafted with bold flavors and tech-inspired presentation
          </p>
        </div>
        {/* Grid layout for featured dishes - 3 columns on desktop, stacks on mobile */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Array of featured dishes data */}
          {[
            {
              name: 'Loaded Street Burger',
              image: 'https://images.unsplash.com/photo-1687937139478-1743eb2de051?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXJnZXIlMjBzdHJlZXQlMjBmb29kfGVufDF8fHx8MTc2MzQ4NDA4MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
              description: 'Double patty with special sauce and crispy fries',
            },
            {
              name: 'Fusion Ramen Bowl',
              image: 'https://images.unsplash.com/photo-1697652974652-a2336106043b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYW1lbiUyMGJvd2x8ZW58MXx8fHwxNzYzNDU2NTY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
              description: 'Rich broth with handmade noodles and toppings',
            },
            {
              name: 'Street Tacos',
              image: 'https://images.unsplash.com/photo-1648437595587-e6a8b0cdf1f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjB0YWNvc3xlbnwxfHx8fDE3NjM0ODQwODF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
              description: 'Authentic street-style tacos with fresh toppings',
            },
          ].map((dish, index) => (
            // Card for each featured dish
            <Card key={index} className="overflow-hidden hover:shadow-lg hover:shadow-[#00ff88]/20 transition-all bg-[#0f1f3a] border-[#00ff88]/20">
              {/* Dish image */}
              <ImageWithFallback
                src={dish.image}
                alt={dish.name}
                className="w-full h-64 object-cover"
              />
              {/* Dish details */}
              <div className="p-6">
                <h3 className="mb-2 text-white">{dish.name}</h3>
                <p className="text-white/70">{dish.description}</p>
              </div>
            </Card>
          ))}
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
            <p className="text-white/70">info@byteandbite.com</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
