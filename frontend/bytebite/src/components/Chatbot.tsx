import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { MessageCircle, X, Send, Bot, User, Star, ThumbsDown } from 'lucide-react';
import { api } from '../utils/api';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
  relatedQuestion?: string;
  rating?: number;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      content: 'Hi! I\'m the Byte&Bite assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userQ = inputMessage;
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: userQ,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await api.sendChatMessage(userQ);
      const botContent = response.success ? response.reply : "System glitch. Try again.";

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        content: botContent,
        timestamp: new Date(),
        relatedQuestion: userQ,
      };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        content: "Network error.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = async (msgId: string, question: string, answer: string, rating: number) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, rating } : m));
    try {
      await api.rateChatMessage(question, answer, rating);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#00ff88] hover:bg-[#00ff88]/90 text-[#0a1628] shadow-lg z-50 transition-transform hover:scale-110"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] bg-[#0f1f3a] border-[#00ff88]/20 shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-[#00ff88]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00ff88]/20 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-[#00ff88]" />
              </div>
              <div>
                <h3 className="text-white">Byte&Bite AI</h3>
                <p className="text-white/50 text-xs">Powered by Gemini 2.0</p>
              </div>
            </div>
            <Button onClick={() => setIsOpen(false)} variant="ghost" size="icon" className="hover:bg-[#1a2f4a] text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.sender === 'bot' ? 'bg-[#00ff88]/20' : 'bg-[#1a2f4a]'}`}>
                  {message.sender === 'bot' ? <Bot className="w-4 h-4 text-[#00ff88]" /> : <User className="w-4 h-4 text-white" />}
                </div>

                <div className="flex flex-col gap-1 max-w-[75%]">
                  <div className={`rounded-lg p-3 ${message.sender === 'bot' ? 'bg-[#1a2f4a] text-white' : 'bg-[#00ff88] text-[#0a1628]'}`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {message.sender === 'bot' && message.relatedQuestion && (
                    <div className="flex items-center gap-1 mt-1 bg-black/40 p-2 rounded-md self-start border border-[#00ff88]/10">
                      <span className="text-[10px] text-white/60 mr-1">Helpful?</span>
                      
                      <button
                        onClick={() => handleRate(message.id, message.relatedQuestion!, message.content, 0)}
                        className="p-1 hover:scale-110 transition-transform"
                        disabled={message.rating !== undefined}
                      >
                        <ThumbsDown 
                            className="w-4 h-4" 
                            color={message.rating === 0 ? "#ef4444" : "#6b7280"} // Red if 0, Gray otherwise
                            fill={message.rating === 0 ? "#ef4444" : "none"}
                        />
                      </button>

                      <div className="w-px h-3 bg-white/10 mx-1"></div>

                      {[1, 2, 3, 4, 5].map((star) => {
                        const isSelected = (message.rating || 0) >= star;
                        return (
                            <button
                              key={star}
                              onClick={() => handleRate(message.id, message.relatedQuestion!, message.content, star)}
                              className="p-0.5 hover:scale-110 transition-transform focus:outline-none"
                              disabled={message.rating !== undefined}
                            >
                              <Star 
                                className="w-4 h-4" 
                                // 👇 强制颜色逻辑：选中用亮黄色(#facc15)，未选中用灰色(#6b7280)
                                color={isSelected ? "#facc15" : "#6b7280"} 
                                fill={isSelected ? "#facc15" : "none"}
                              />
                            </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-[#00ff88]/20 rounded-full flex items-center justify-center"><Bot className="w-4 h-4 text-[#00ff88]" /></div>
                <div className="bg-[#1a2f4a] rounded-lg p-3"><span className="text-white/50 text-xs">Thinking...</span></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-[#00ff88]/20">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask something..."
                className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" className="bg-[#00ff88] text-[#0a1628] hover:bg-[#00ff88]/90" disabled={isLoading || !inputMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </>
  );
}