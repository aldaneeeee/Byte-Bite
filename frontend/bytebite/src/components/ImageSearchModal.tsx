import { useState, useRef } from 'react';
import { Camera, Upload, X, AlertCircle, Sparkles, ArrowRight, Search, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { api } from '../utils/api';
import { useCart } from './CartContext';
import { Badge } from './ui/badge';

interface Dish {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  is_vip: boolean;
  chef_name: string;
}

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImageSearchModal({ isOpen, onClose }: ImageSearchModalProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Dish[]>([]);
  const [error, setError] = useState('');
  const [identifiedName, setIdentifiedName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToCart } = useCart();

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        setError("File is too large (Max 5MB)");
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
      setResults([]);
      setIdentifiedName('');
    }
  };

  const handleSearch = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const res = await api.searchMenuByImage(selectedImage);
      
      if (res.success) {
        setResults(res.dishes);
        setIdentifiedName(res.identified_as);
      } else {
        setError(res.message || "No matches found");
        if (res.identified_as) setIdentifiedName(res.identified_as);
      }
    } catch (err) {
      setError("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setResults([]);
    setError('');
    setIdentifiedName('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={onClose}>
      <Card className="bg-[#0f1f3a] border border-[#00ff88]/30 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,255,136,0.1)] rounded-2xl" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b border-[#00ff88]/20 flex justify-between items-center bg-[#0a1628]/60">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-[#00ff88] animate-pulse w-5 h-5" />
            AI Food Lens
          </h2>
          <Button 
            onClick={onClose} 
            variant="ghost" 
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Step 1 — Upload */}
          {!previewUrl ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div 
                className="border-2 border-dashed border-[#00ff88]/40 rounded-2xl p-12 text-center hover:bg-[#00ff88]/5 hover:border-[#00ff88]/70 transition-all cursor-pointer max-w-md w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                <div className="bg-[#00ff88]/10 w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-10 h-10 text-[#00ff88]" />
                </div>
                <h3 className="text-white font-semibold text-lg">Click to Upload</h3>
                <p className="text-white/40 text-xs mt-1">JPG, PNG, WEBP (Max 5MB)</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">

              {/* Left — Preview */}
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                
                <div className="relative w-64 h-64 mx-auto rounded-xl overflow-hidden border border-[#00ff88]/20 bg-black/20 group">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Button 
                      variant="outline" 
                      onClick={handleReset}
                      className="border-white text-white hover:bg-white hover:text-black"
                    >
                      Change Photo
                    </Button>
                  </div>
                </div>


                {!results.length && !loading && !error && (
                  <Button 
                    onClick={handleSearch}
                    className="w-full bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628] font-bold shadow-lg py-4"
                  >
                    <Search className="w-4 h-4 mr-2" /> Identify Dish
                  </Button>
                )}

                {loading && (
                  <div className="bg-[#1a2f4a] border border-[#00ff88]/20 rounded-xl p-4 text-center animate-pulse">
                    <div className="w-8 h-8 border-4 border-[#00ff88] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-[#00ff88] font-mono text-sm">Analyzing...</p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/40 text-center p-4 rounded-xl">
                    <p className="text-red-400 font-semibold flex items-center justify-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4" /> Analysis Failed
                    </p>
                    <p className="text-white/60 text-xs mt-1">{error}</p>
                    <Button 
                      variant="ghost" 
                      onClick={handleReset} 
                      className="mt-2 text-red-300 hover:text-red-200 hover:bg-red-500/10 h-7 text-xs"
                    >
                      Try Again
                    </Button>
                  </div>
                )}

              </div>

              {/* Right — Results */}
              <div className="w-full md:w-2/3">

                {results.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-white text-lg font-semibold">
                      Matches for: 
                      <span className="ml-2 text-[#00ff88] font-bold uppercase tracking-wide">{identifiedName}</span>
                    </h3>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">

                      {results.map((dish) => (
                        <div 
                          key={dish.id} 
                          className="flex items-center bg-[#1a2f4a] border border-[#00ff88]/10 hover:border-[#00ff88]/40 transition-all rounded-xl shadow-sm hover:shadow-md p-3 gap-4"
                        >

                          {/* Thumbnail — Fixed Size (修复图片过大问题) */}
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-black/40">
                            <img 
                              src={dish.image} 
                              alt={dish.name} 
                              className="object-cover w-full h-full transition-transform duration-300 hover:scale-110"
                            />
                            {dish.is_vip && (
                              <Badge className="absolute top-1 left-1 bg-purple-600/90 text-[10px] px-1.5 py-0 border-0">
                                VIP
                              </Badge>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h4 className="text-white font-semibold text-sm max-w-[70%] truncate">{dish.name}</h4>
                              <span className="text-[#00ff88] font-bold text-sm">${dish.price.toFixed(2)}</span>
                            </div>
                            <p className="text-white/50 text-xs line-clamp-2 mt-1">{dish.description}</p>

                            <div className="flex justify-end mt-2">
                              <Button
                                size="sm"
                                className="bg-[#00ff88] text-[#0a1628] hover:bg-[#00dd77] h-7 px-3 text-xs"
                                onClick={() => {
                                  addToCart(dish);
                                  onClose();
                                  alert(`Added ${dish.name} to cart!`);
                                }}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" /> Add Order
                              </Button>
                            </div>
                          </div>

                        </div>
                      ))}

                    </div>
                  </div>
                ) : (
                  !loading && !error && (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 border border-dashed border-white/10 rounded-xl py-10">
                      <Sparkles className="w-10 h-10 mb-2 opacity-20" />
                      <p className="text-sm">Matches will appear here</p>
                    </div>
                  )
                )}

              </div>

            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
