import { createContext, useContext, useState, ReactNode } from 'react';

// Interface defining the structure of a menu item
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

// Interface for cart items (extends MenuItem with quantity)
export interface CartItem extends MenuItem {
  quantity: number;
}

// Interface defining all cart-related functions and data available to components
interface CartContextType {
  cart: CartItem[]; // Array of items in the cart
  addToCart: (item: MenuItem) => void; // Add item to cart
  removeFromCart: (id: string) => void; // Remove item completely from cart
  updateQuantity: (id: string, quantity: number) => void; // Change item quantity
  clearCart: () => void; // Empty the entire cart
  getTotalPrice: () => number; // Calculate total price of all items
  getTotalItems: () => number; // Calculate total number of items
}

// Create context with undefined default (will be provided by CartProvider)
const CartContext = createContext<CartContextType | undefined>(undefined);

// CartProvider component wraps the app and manages cart state
export function CartProvider({ children }: { children: ReactNode }) {
  // State to store all cart items
  const [cart, setCart] = useState<CartItem[]>([]);

  // Function to add an item to cart or increase quantity if already exists
  const addToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      // Check if item already exists in cart
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        // If exists, increment quantity by 1
        return prevCart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      // If new item, add it with quantity of 1
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  // Function to completely remove an item from cart
  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  // Function to update the quantity of a specific item
  const updateQuantity = (id: string, quantity: number) => {
    // If quantity is 0 or less, remove the item
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    // Otherwise, update the quantity
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  // Function to empty the entire cart
  const clearCart = () => {
    setCart([]);
  };

  // Function to calculate total price (item price × quantity for all items)
  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  // Function to calculate total number of items in cart
  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // Provide all cart state and functions to child components
  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalPrice,
        getTotalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// Custom hook to access cart context in any component
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}