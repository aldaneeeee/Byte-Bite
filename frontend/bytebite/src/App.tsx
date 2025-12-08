// Import React Router components for navigation between pages
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Import all page components
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { MenuPage } from './components/MenuPage';
import { CheckoutPage } from './components/CheckoutPage';
import { LoginPage } from './components/LoginPage';
import { ProfilePage } from './components/ProfilePage';
import { AddFundsPage } from './components/AddFundsPage';
import { ForumPage } from './components/ForumPage';
// Import employee components
import { EmployeeLoginPage } from './components/EmployeeLoginPage';
import { ManagerDashboard } from './components/ManagerDashboard';
import { ChefDashboard } from './components/ChefDashboard';
import { DeliveryDashboard } from './components/DeliveryDashboard';
// Import the shopping cart context provider
import { CartProvider } from './components/CartContext';
// Import the AI chatbot component
import { Chatbot } from './components/Chatbot';
// Import toast notifications
import { Toaster } from './components/ui/sonner';

// Main App component - entry point of the application
export default function App() {
  return (
    // Router wraps the entire app to enable navigation
    <Router>
      {/* CartProvider makes shopping cart state available to all components */}
      <CartProvider>
        <div className="min-h-screen bg-[#0a1628]">
          {/* Navbar appears on all pages */}
          <Navbar />
          {/* Routes define which component to show for each URL path */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/forum" element={<ForumPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/add-funds" element={<AddFundsPage />} />
            {/* Employee routes */}
            <Route path="/employee/login" element={<EmployeeLoginPage />} />
            <Route path="/employee/manager" element={<ManagerDashboard />} />
            <Route path="/employee/chef" element={<ChefDashboard />} />
            <Route path="/employee/delivery" element={<DeliveryDashboard />} />
            {/* Catch-all route redirects any unknown paths to home page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {/* AI Chatbot - available on all pages */}
          <Chatbot />
          {/* Toast notification container */}
          <Toaster />
        </div>
      </CartProvider>
    </Router>
  );
}