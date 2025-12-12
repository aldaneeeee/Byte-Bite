import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
// wei: add 'Utensils, Clock, CheckCircle'
import { ChefHat, Plus, Edit, Trash2, Star, Utensils, Clock, CheckCircle } from 'lucide-react';

interface Dish {
  dish_id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_vip: boolean;
  chef_id?: number;
}

// wei
interface OrderItem {
  name: string;
  quantity: number;
  image_url: string;
}

// wei
interface ChefOrder {
  order_id: number;
  status: string;
  total_price: number;
  order_time: string;
  items: OrderItem[];
  customer_id: number;
}

interface Complaint {
  complaint_id: number;
  complainant_type: string;
  complainant_id: number;
  accused_type: string;
  accused_id: number;
  category: string;
  description: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  appeal_message?: string;
  appeal_submitted_at?: string;
}

interface ComplaintCardProps {
  complaint: Complaint;
  onAppealSubmitted: () => void;
}

function ComplaintCard({ complaint, onAppealSubmitted }: ComplaintCardProps) {
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealMessage, setAppealMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealMessage.trim()) return;

    setSubmitting(true);
    try {
      const response = await api.appealComplaint(complaint.complaint_id, { appeal_message: appealMessage });
      if (response.success) {
        setShowAppealForm(false);
        setAppealMessage('');
        onAppealSubmitted();
      } else {
        alert('Failed to submit appeal');
      }
    } catch (err) {
      console.error('Failed to submit appeal', err);
      alert('Failed to submit appeal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptComplaint = async () => {
    if (!confirm('Are you sure you want to accept this complaint? This will apply penalties to your account.')) return;

    setAccepting(true);
    try {
      const response = await api.acceptComplaint(complaint.complaint_id);
      if (response.success) {
        onAppealSubmitted();
      } else {
        alert('Failed to accept complaint');
      }
    } catch (err) {
      console.error('Failed to accept complaint', err);
      alert('Failed to accept complaint');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="bg-[#1a2f4a] p-4 rounded-lg border border-[#00ff88]/10">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#00ff88] font-bold text-sm">
              Complaint #{complaint.complaint_id}
            </span>
            <Badge className={`text-xs ${complaint.status === 'pending' ? 'bg-yellow-500' : complaint.status === 'reviewed' ? 'bg-blue-500' : 'bg-green-500'}`}>
              {complaint.status}
            </Badge>
          </div>
          <p className="text-white/60 text-xs">
            Filed by {complaint.complainant_type} #{complaint.complainant_id} • {new Date(complaint.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-white/80 font-medium text-sm mb-1">Category: {complaint.category}</p>
        <p className="text-white/70 text-sm">{complaint.description}</p>
      </div>

      {complaint.appeal_message && (
        <div className="mb-3 p-3 bg-[#0f1f3a] rounded border-l-2 border-[#00ff88]">
          <p className="text-[#00ff88] font-medium text-sm mb-1">Your Appeal:</p>
          <p className="text-white/70 text-sm">{complaint.appeal_message}</p>
          <p className="text-white/40 text-xs mt-1">
            Submitted: {new Date(complaint.appeal_submitted_at!).toLocaleDateString()}
          </p>
        </div>
      )}

      {!complaint.appeal_message && (complaint.status === 'pending' || complaint.status === 'notified' || complaint.status === 'upheld') && (
        <div className="flex gap-2">
          {!showAppealForm ? (
            <Button
              onClick={() => setShowAppealForm(true)}
              size="sm"
              variant="outline"
              className="border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/10"
            >
              Submit Appeal
            </Button>
          ) : (
            <form onSubmit={handleSubmitAppeal} className="flex-1 space-y-2">
              <Textarea
                value={appealMessage}
                onChange={(e) => setAppealMessage(e.target.value)}
                placeholder="Enter your appeal message..."
                className="bg-[#0f1f3a] border-[#00ff88]/30 text-white text-sm"
                rows={3}
                required
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]"
                >
                  {submitting ? 'Submitting...' : 'Submit Appeal'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowAppealForm(false);
                    setAppealMessage('');
                  }}
                  size="sm"
                  variant="outline"
                  className="border-[#00ff88]/30 text-white"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {(complaint.status === 'upheld' || complaint.status === 'pending' || complaint.status === 'notified' || complaint.status === 'resolved') && !complaint.appeal_message && (
        <div className="flex gap-2">
          <Button
            onClick={handleAcceptComplaint}
            size="sm"
            disabled={accepting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {accepting ? 'Accepting...' : 'Accept Complaint'}
          </Button>
        </div>
      )}
    </div>
  );
}

export function ChefDashboard() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  
  const [activeOrders, setActiveOrders] = useState<ChefOrder[]>([]); // wei
  const [reviews, setReviews] = useState<any[]>([]); // wei
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // New dish form
  const [newDish, setNewDish] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    is_vip: false
  });

  // Edit dish form
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    is_vip: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadDishes(), loadOrders(), loadComplaints()]);
    setLoading(false);
  };

  const loadDishes = async () => {
    try {
      const response = await api.getChefDishes();
      if (response.success) {
        setDishes(response.dishes);
      } else {
        setError(response.message || 'Failed to load dishes');
      }
    } catch (err) {
      console.error('Failed to load dishes');
    }
  };

  // wei
  const loadOrders = async () => {
    try {
      const res = await api.getChefOrders();
      if (res.success) {
        setActiveOrders(res.orders);
      }
    } catch (err) {
      console.error("Failed to load orders", err);
    }
  };

  const loadComplaints = async () => {
    try {
      const res = await api.getComplaints();
      if (res.success) {
        setComplaints(res.complaints);
      }
    } catch (err) {
      console.error("Failed to load complaints", err);
    }
  };

  // wei
  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      const res = await api.updateOrderStatus(orderId, newStatus);
      if (res.success) {
        setSuccess(`Order #${orderId} moved to ${newStatus}`);
        loadOrders(); // refresh orders
      }
    } catch (err) {
      setError("Failed to update status");
    }
  };

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dishData = {
        name: newDish.name,
        description: newDish.description,
        price: parseFloat(newDish.price),
        image_url: newDish.image_url,
        is_vip: newDish.is_vip
      };

      const response = await api.createDish(dishData);
      if (response.success) {
        setSuccess('Dish created successfully');
        setNewDish({ name: '', description: '', price: '', image_url: '', is_vip: false });
        loadDishes();
      } else {
        setError(response.message || 'Failed to create dish');
      }
    } catch (err) {
      setError('Failed to create dish');
    }
  };

  const handleEditDish = (dish: Dish) => {
    setEditingDish(dish);
    setEditForm({
      name: dish.name,
      description: dish.description,
      price: dish.price.toString(),
      image_url: dish.image_url,
      is_vip: dish.is_vip
    });
  };

  const handleUpdateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish) return;

    try {
      const dishData = {
        name: editForm.name,
        description: editForm.description,
        price: parseFloat(editForm.price),
        image_url: editForm.image_url,
        is_vip: editForm.is_vip
      };

      const response = await api.updateDish(editingDish.dish_id, dishData);
      if (response.success) {
        setSuccess('Dish updated successfully');
        setEditingDish(null);
        loadDishes();
      } else {
        setError(response.message || 'Failed to update dish');
      }
    } catch (err) {
      setError('Failed to update dish');
    }
  };

  const handleDeleteDish = async (dishId: number) => {
    if (!confirm('Are you sure you want to delete this dish?')) return;

    try {
      const response = await api.deleteDish(dishId);
      if (response.success) {
        setSuccess('Dish deleted successfully');
        loadDishes();
      } else {
        setError(response.message || 'Failed to delete dish');
      }
    } catch (err) {
      setError('Failed to delete dish');
    }
  };

  const handleLogout = () => {
    api.logout(); // 清除所有 token
    navigate('/employee/login');
  };

  if (loading && dishes.length === 0 && activeOrders.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Header */}
      <div className="bg-[#0f1f3a] border-b border-[#00ff88]/20 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-[#00ff88]" />
            <div>
              <h1 className="text-2xl font-bold">Chef Dashboard</h1>
              <p className="text-white/70">Menu Management & Dish Creation</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10">
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Alerts */}
        {error && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-500/50 bg-green-500/10">
            <AlertDescription className="text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {/* The kitchen view is opened by default. */}
        <Tabs defaultValue="kitchen" className="space-y-6">
          <TabsList className="bg-[#0f1f3a] border border-[#00ff88]/20">
            {/* 👇👇👇 This fixes the missing "Kitchen" tag that was previously absent. wei 👇👇👇 */}
            <TabsTrigger value="kitchen" className="data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
              Kitchen View
            </TabsTrigger>
            <TabsTrigger value="dishes" className="data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
              My Dishes
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
              Create Dish
            </TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
              Reviews & Ratings
            </TabsTrigger>
            <TabsTrigger value="complaints" className="data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
              Complaints
            </TabsTrigger>
          </TabsList>

          {/* 👇👇👇 Kitchen View Content (wei) 👇👇👇 */}
          <TabsContent value="kitchen">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Active Orders</h2>
                <Button onClick={loadOrders} size="sm" variant="outline" className="border-[#00ff88]/30 text-white">
                    Refresh Orders
                </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {activeOrders.length === 0 && (
                <Card className="bg-[#0f1f3a] border-[#00ff88]/20 col-span-2 p-12 text-center">
                    <Utensils className="w-12 h-12 text-[#00ff88]/20 mx-auto mb-4" />
                    <p className="text-white/50 text-lg">No active orders.</p>
                    <p className="text-white/30 text-sm">Wait for customers to place orders!</p>
                </Card>
                )}

                {activeOrders.map((order) => (
                <Card key={order.order_id} className="bg-[#0f1f3a] border-[#00ff88]/20 p-6 shadow-lg shadow-[#00ff88]/5">
                    <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-white">Order #{order.order_id}</h3>
                        <div className="flex items-center gap-2 text-white/60 text-sm mt-1">
                        <Clock className="w-4 h-4" />
                        {new Date(order.order_time).toLocaleString()}
                        </div>
                    </div>
                    <Badge className={`text-base px-3 py-1 text-white ${order.status === 'Cooking' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                        {order.status}
                    </Badge>
                    </div>

                    <div className="space-y-3 mb-6 bg-[#1a2f4a] p-4 rounded-lg">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-[#00ff88]/10 last:border-0 pb-2 last:pb-0">
                        <span className="text-white font-medium text-lg">{item.name}</span>
                        <div className="flex items-center">
                            <span className="text-white/50 text-sm mr-2">Qty:</span>
                            <Badge variant="outline" className="text-[#00ff88] border-[#00ff88] font-bold text-lg">
                                {item.quantity}
                            </Badge>
                        </div>
                        </div>
                    ))}
                    </div>

                    <div className="flex gap-3">
                    {order.status === 'Pending' && (
                        <Button 
                        onClick={() => handleStatusUpdate(order.order_id, 'Cooking')}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-12"
                        >
                        <Utensils className="w-5 h-5 mr-2" />
                        Start Cooking
                        </Button>
                    )}
                    
                    {order.status === 'Cooking' && (
                        <Button 
                        onClick={() => handleStatusUpdate(order.order_id, 'Ready for Delivery')}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-12"
                        >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Mark Ready
                        </Button>
                    )}
                    </div>
                </Card>
                ))}
            </div>
          </TabsContent>

          {/* My Dishes Tab */}
          <TabsContent value="dishes">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">My Dishes</h2>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#00ff88]/20">
                      <TableHead className="text-white">Name</TableHead>
                      <TableHead className="text-white">Price</TableHead>
                      <TableHead className="text-white">VIP</TableHead>
                      <TableHead className="text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dishes.map((dish) => (
                      <TableRow key={dish.dish_id} className="border-[#00ff88]/10">
                        <TableCell className="text-white">{dish.name}</TableCell>
                        <TableCell className="text-white">${dish.price.toFixed(2)}</TableCell>
                        <TableCell>
                          {dish.is_vip && <Badge className="bg-yellow-500 text-white">VIP</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditDish(dish)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDeleteDish(dish.dish_id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Create Dish Tab */}
          <TabsContent value="create">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Create New Dish</h2>
                <form onSubmit={handleCreateDish} className="space-y-4 max-w-md">
                  <div>
                    <Label htmlFor="name" className="text-white">Dish Name</Label>
                    <Input
                      id="name"
                      value={newDish.name}
                      onChange={(e) => setNewDish({...newDish, name: e.target.value})}
                      className="bg-[#1a2a3a] border-[#00ff88]/30 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-white">Description</Label>
                    <Textarea
                      id="description"
                      value={newDish.description}
                      onChange={(e) => setNewDish({...newDish, description: e.target.value})}
                      className="bg-[#1a2a3a] border-[#00ff88]/30 text-white"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="price" className="text-white">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={newDish.price}
                      onChange={(e) => setNewDish({...newDish, price: e.target.value})}
                      className="bg-[#1a2a3a] border-[#00ff88]/30 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="image_url" className="text-white">Image URL</Label>
                    <Input
                      id="image_url"
                      value={newDish.image_url}
                      onChange={(e) => setNewDish({...newDish, image_url: e.target.value})}
                      className="bg-[#1a2a3a] border-[#00ff88]/30 text-white"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_vip"
                      checked={newDish.is_vip}
                      onChange={(e) => setNewDish({...newDish, is_vip: e.target.checked})}
                      className="rounded border-[#00ff88]/30"
                    />
                    <Label htmlFor="is_vip" className="text-white">VIP Exclusive Dish</Label>
                  </div>

                  <Button type="submit" className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Dish
                  </Button>
                </form>
              </div>
            </Card>
          </TabsContent>

          {/* Reviews Tab (wei) */}
          <TabsContent value="reviews">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Dish Reviews & Ratings</h2>
                  <Button 
                    onClick={async () => {
                      try {
                        const res = await api.getChefReviews();
                        if (res.success) setReviews(res.reviews);
                      } catch(e) { console.error(e); }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10"
                  >
                    Refresh Reviews
                  </Button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {reviews.length === 0 && (
                    <div className="text-white/50 text-center py-8">
                      No reviews received yet.
                    </div>
                  )}
                  
                  {reviews.map((review) => (
                    <div key={review.review_id} className="bg-[#1a2f4a] p-4 rounded-lg border border-[#00ff88]/10">
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[#00ff88] font-bold text-sm">Customer #{review.customer_id}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 ${i < review.dish_rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-white/40 text-xs">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                      {review.comment ? (
                        <p className="text-white/80 text-sm">"{review.comment}"</p>
                      ) : (
                        <p className="text-white/30 text-sm italic">No text comment provided</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Complaints Tab */}
          <TabsContent value="complaints">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Complaints & Appeals</h2>
                  <Button 
                    onClick={loadComplaints}
                    variant="outline"
                    size="sm"
                    className="border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10"
                  >
                    Refresh Complaints
                  </Button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {complaints.length === 0 && (
                    <div className="text-white/50 text-center py-8">
                      No complaints found.
                    </div>
                  )}
                  
                  {complaints.map((complaint) => (
                    <ComplaintCard 
                      key={complaint.complaint_id} 
                      complaint={complaint} 
                      onAppealSubmitted={loadComplaints}
                    />
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Edit Dish Modal */}
        {editingDish && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20 max-w-md w-full">
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Edit Dish</h3>
                <form onSubmit={handleUpdateDish} className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name" className="text-white">Dish Name</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="bg-[#1a2a3a] border-[#00ff88]/30 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-description" className="text-white">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      className="bg-[#1a2a3a] border-[#00ff88]/30 text-white"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-price" className="text-white">Price ($)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                      className="bg-[#1a2a3a] border-[#00ff88]/30 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-image_url" className="text-white">Image URL</Label>
                    <Input
                      id="edit-image_url"
                      value={editForm.image_url}
                      onChange={(e) => setEditForm({...editForm, image_url: e.target.value})}
                      className="bg-[#1a2a3a] border-[#00ff88]/30 text-white"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-is_vip"
                      checked={editForm.is_vip}
                      onChange={(e) => setEditForm({...editForm, is_vip: e.target.checked})}
                      className="rounded border-[#00ff88]/30"
                    />
                    <Label htmlFor="edit-is_vip" className="text-white">VIP Exclusive Dish</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628] flex-1">
                      Update Dish
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setEditingDish(null)}
                      variant="outline"
                      className="border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}