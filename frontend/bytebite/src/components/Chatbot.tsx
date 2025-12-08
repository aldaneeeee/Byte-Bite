import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';

// Interface for chat messages
interface Message {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

// AI Chatbot component - floating chat widget available to all users
export function Chatbot() {
  // State for chatbot open/closed
  const [isOpen, setIsOpen] = useState(false);
  // Array of messages in the conversation
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      content: 'Hi! I\'m the Byte&Bite assistant. How can I help you today? You can ask me about our menu, delivery times, or anything else!',
      timestamp: new Date(),
    },
  ]);
  // Current message being typed
  const [inputMessage, setInputMessage] = useState('');
  // Loading state while bot is "thinking"
  const [isLoading, setIsLoading] = useState(false);
  // Ref to scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    setMessages([...messages, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate bot response delay (replace with actual API call)
    // TODO: Replace with real AI API call: api.sendChatMessage(inputMessage)
    setTimeout(() => {
      const botResponse = getBotResponse(inputMessage);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        content: botResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
    }, 1000);
  };

  // Mock bot response logic (replace with actual AI integration)
  const getBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    // Menu questions
    if (input.includes('menu') || input.includes('food') || input.includes('dish')) {
      return 'We have an amazing menu of tech-themed street food! Popular items include the Code Burger, Async Ramen, Debug Tacos, and Binary Pizza. You can view our full menu by clicking the "Menu" link in the navigation bar. Is there a specific type of food you\'re interested in?';
    }

    // Delivery questions
    if (input.includes('deliver') || input.includes('shipping') || input.includes('time')) {
      return 'We typically deliver within 30-45 minutes depending on your location. We cover most areas within a 10-mile radius. You can check if we deliver to your area by going to checkout and entering your address!';
    }

    // Hours questions
    if (input.includes('hour') || input.includes('open') || input.includes('close')) {
      return 'We\'re open Monday-Saturday from 11:00 AM to 10:00 PM, and Sunday from 12:00 PM to 9:00 PM. Online ordering is available during these hours!';
    }

    // Price questions
    if (input.includes('price') || input.includes('cost') || input.includes('expensive')) {
      return 'Our menu items range from $8 to $18. We also offer combo deals and daily specials! Check out the menu page to see current prices and any ongoing promotions.';
    }

    // Account questions
    if (input.includes('account') || input.includes('login') || input.includes('sign up')) {
      return 'You can create an account or login by clicking the user icon in the top right corner. Having an account lets you save your favorite orders, track deliveries, and join our community forum!';
    }

    // Payment questions
    if (input.includes('payment') || input.includes('pay') || input.includes('credit card')) {
      return 'We accept all major credit cards, debit cards, and digital payment methods like Apple Pay and Google Pay. Payment is processed securely at checkout.';
    }

    // Vegan/dietary questions
    if (input.includes('vegan') || input.includes('vegetarian') || input.includes('gluten') || input.includes('allerg')) {
      return 'We offer several vegetarian options and are working on expanding our vegan menu. If you have specific dietary restrictions or allergies, please mention them in the special instructions at checkout, and our kitchen will do their best to accommodate!';
    }

    // Forum questions
    if (input.includes('forum') || input.includes('community') || input.includes('discuss')) {
      return 'We have an active community forum where users can share reviews, ask questions, and make suggestions! You need to be logged in to access the forum. Just create a free account to join the conversation!';
    }

    // Specials/deals questions
    if (input.includes('special') || input.includes('deal') || input.includes('discount') || input.includes('promo')) {
      return 'We run special promotions regularly! Check our home page for current deals, and make sure to create an account to receive exclusive offers and updates about new menu items.';
    }

    // Greetings
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return 'Hello! How can I help you today? Feel free to ask me about our menu, delivery, hours, or anything else!';
    }

    // Thanks
    if (input.includes('thank') || input.includes('thanks')) {
      return 'You\'re welcome! Is there anything else I can help you with?';
    }

    // Default response
    return 'I\'m here to help! You can ask me about our menu items, delivery times, hours of operation, payment methods, dietary options, or how to create an account. What would you like to know?';
  };

  return (
    <>
      {/* Floating Chat Button - Always visible in bottom right */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#00ff88] hover:bg-[#00ff88]/90 text-[#0a1628] shadow-lg z-50 transition-transform hover:scale-110"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] bg-[#0f1f3a] border-[#00ff88]/20 shadow-2xl z-50 flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#00ff88]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00ff88]/20 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-[#00ff88]" />
              </div>
              <div>
                <h3 className="text-white">Byte&Bite Assistant</h3>
                <p className="text-white/50 text-xs">Always here to help</p>
              </div>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="hover:bg-[#1a2f4a] text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.sender === 'bot'
                      ? 'bg-[#00ff88]/20'
                      : 'bg-[#1a2f4a]'
                  }`}
                >
                  {message.sender === 'bot' ? (
                    <Bot className="w-4 h-4 text-[#00ff88]" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[75%] rounded-lg p-3 ${
                    message.sender === 'bot'
                      ? 'bg-[#1a2f4a] text-white'
                      : 'bg-[#00ff88] text-[#0a1628]'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === 'bot'
                        ? 'text-white/50'
                        : 'text-[#0a1628]/50'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-[#00ff88]/20 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#00ff88]" />
                </div>
                <div className="bg-[#1a2f4a] rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[#00ff88]/20">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="bg-[#00ff88] text-[#0a1628] hover:bg-[#00ff88]/90"
                disabled={isLoading || !inputMessage.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <p className="text-white/50 text-xs mt-2 text-center">
              Powered by AI • Available 24/7
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
