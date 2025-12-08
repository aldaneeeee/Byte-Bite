import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut, Users } from 'lucide-react';
import { useCart } from './CartContext';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { api } from '../utils/api';

// Navbar component - appears at top of every page
export function Navbar() {
  // Get current URL location to highlight active page
  const location = useLocation();
  // Get cart item count to display in badge
  const { getTotalItems } = useCart();
  // State to control mobile menu open/close
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // State to track if user is logged in
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const totalItems = getTotalItems();

  // Check if user is logged in on mount and when location changes
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    setIsLoggedIn(!!authToken);
  }, [location]);

  // Helper function to check if a navigation link is the current page
  const isActive = (path: string) => location.pathname === path;

  // Array of navigation links for easy mapping
  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/menu', label: 'Menu' },
    { path: '/forum', label: 'Forum' },
    { path: '/checkout', label: 'Checkout' },
  ];

  // Handle logout
  const handleLogout = () => {
    api.logout();
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setMobileMenuOpen(false);
  };

  return (
    // Sticky navbar that stays at top when scrolling
    <nav className="bg-[#0f1f3a] shadow-lg border-b border-[#00ff88]/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - clicking returns to home page */}
          <Link to="/" className="flex items-center">
            <span className="text-[#00ff88] text-xl tracking-wider">Byte&Bite</span>
          </Link>

          {/* Desktop Navigation - hidden on mobile, visible on medium+ screens */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-colors ${
                  isActive(link.path)
                    ? 'text-[#00ff88]' // Active page is highlighted in neon green
                    : 'text-white/80 hover:text-[#00ff88]' // Inactive pages hover neon green
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side Icons - Cart and Login/Profile */}
          <div className="flex items-center space-x-4">
            {/* Shopping cart icon with item count badge */}
            <Link to="/checkout" className="relative">
              <Button variant="ghost" size="icon" className="hover:bg-[#1a2f4a] text-white">
                <ShoppingCart className="w-5 h-5" />
                {/* Only show badge if cart has items */}
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#00ff88] text-[#0a1628] text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
            
            {/* User Profile or Login - changes based on login state */}
            {isLoggedIn ? (
              <Link to="/profile">
                <Button variant="ghost" size="icon" className="hover:bg-[#1a2f4a] text-white">
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="icon" className="hover:bg-[#1a2f4a] text-white">
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            )}

            {/* Employee Login Button */}
            <Link to="/employee/login">
              <Button variant="ghost" size="icon" className="hover:bg-[#1a2f4a] text-white" title="Employee Login">
                <Users className="w-5 h-5" />
              </Button>
            </Link>

            {/* Mobile Menu Button - only visible on small screens */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-[#1a2f4a] text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {/* Toggle between X and hamburger menu icon */}
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu - slides down when menu button is clicked */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block py-2 px-4 rounded-md transition-colors ${
                  isActive(link.path)
                    ? 'bg-[#1a2f4a] text-[#00ff88]' // Active page has dark background
                    : 'text-white/80 hover:bg-[#1a2f4a]/50'
                }`}
                onClick={() => setMobileMenuOpen(false)} // Close menu when link is clicked
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile Logout Button */}
            {isLoggedIn && (
              <>
                <Link
                  to="/profile"
                  className="block py-2 px-4 text-white/80 hover:bg-[#1a2f4a]/50 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-4 h-4 inline mr-2" />
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left py-2 px-4 text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4 inline mr-2" />
                  Logout
                </button>
              </>
            )}

            {/* Mobile Employee Login */}
            <Link
              to="/employee/login"
              className="block py-2 px-4 text-white/80 hover:bg-[#1a2f4a]/50 rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Employee Login
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}