import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { api } from '../utils/api'; // Import API utility

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

    // Add user message to chat UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call the real Backend API
      const response = await api.sendChatMessage(userMessage.content);
      
      const botContent = response.success 
        ? response.reply 
        : "Sorry, I'm having trouble connecting to the mainframe. Please try again later.";

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        content: botContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error("Chat error:", error);
      // Add error message to UI
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        content: "Network error. Please check your connection.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
                <p className="text-white/50 text-xs">Powered by Gemini AI</p>
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
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                placeholder="Ask about our menu..."
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
              AI can make mistakes. Please check info with staff.
            </p>
          </div>
        </Card>
      )}
    </>
  );
}