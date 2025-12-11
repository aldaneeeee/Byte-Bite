import { useState } from 'react'; // (wei)
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Star, X } from 'lucide-react';
import { api } from '../utils/api';

interface ReviewModalProps {
  orderId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({ orderId, onClose, onSuccess }: ReviewModalProps) {
  const [dishRating, setDishRating] = useState(0);
  const [chefRating, setChefRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complimentChef, setComplimentChef] = useState(false);
  const [complaintChef, setComplaintChef] = useState(false);
  const [complimentDelivery, setComplimentDelivery] = useState(false);
  const [complaintDelivery, setComplaintDelivery] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dishRating === 0 || chefRating === 0 || deliveryRating === 0) {
      setError('Please rate Food, Chef, and Delivery');
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.createReview({
        order_id: orderId,
        chef_rating: chefRating,
        dish_rating: dishRating,
        delivery_rating: deliveryRating,
        comment,
        compliment_chef: complimentChef,
        complaint_chef: complaintChef,
        compliment_delivery: complimentDelivery,
        complaint_delivery: complaintDelivery
      });
      
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to submit review');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to render stars
  const renderStars = (rating: number, setRating: (r: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star 
              className="w-6 h-6"
              // Directly use style attributes or more explicit class combinations
              fill={star <= rating ? "#facc15" : "none"} // #facc15 is the hex value for Tailwind's yellow-400
              stroke={star <= rating ? "#facc15" : "currentColor"}
              color={star <= rating ? "#facc15" : "#6b7280"} // #6b7280 is gray-500
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-[#0f1f3a] border-[#00ff88]/20 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-xl font-bold text-white mb-6">Rate Your Order #{orderId}</h2>
        
        {error && <div className="bg-red-500/10 text-red-400 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white mb-2">How was the food?</label>
            {renderStars(dishRating, setDishRating)}
          </div>

          <div>
            <label className="block text-white mb-2">How was the Chef?</label>
            {renderStars(chefRating, setChefRating)}
          </div>
          <div>
            <label className="block text-white mb-2">How was the Delivery?</label>
            {renderStars(deliveryRating, setDeliveryRating)}
          </div>

          <div>
            <label className="block text-white mb-2">Additional Feedback</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="compliment-chef"
                  checked={complimentChef}
                  onChange={(e) => setComplimentChef(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="compliment-chef" className="text-white text-sm">Compliment the Chef</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="complaint-chef"
                  checked={complaintChef}
                  onChange={(e) => setComplaintChef(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="complaint-chef" className="text-white text-sm">Complain about the Chef</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="compliment-delivery"
                  checked={complimentDelivery}
                  onChange={(e) => setComplimentDelivery(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="compliment-delivery" className="text-white text-sm">Compliment the Delivery</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="complaint-delivery"
                  checked={complaintDelivery}
                  onChange={(e) => setComplaintDelivery(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="complaint-delivery" className="text-white text-sm">Complain about the Delivery</label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-white mb-2">Leave a comment</label>
            <Textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you liked..."
              className="bg-[#1a2f4a] border-[#00ff88]/20 text-white"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#00ff88] text-[#0a1628] hover:bg-[#00dd77]"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </Button>
        </form>
      </Card>
    </div>
  );
}