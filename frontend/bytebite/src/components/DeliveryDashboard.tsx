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
import { Truck, MapPin, Clock, DollarSign, CheckCircle, Package, MessageSquare, Star } from 'lucide-react';

// 1. Updated Interface to include customer_phone and feedback fields
interface Order {
  order_id: number;
  customer_id: number;
  status: string;
  total_price: number;
  order_time: string;
  customer_name?: string;
  customer_address?: string;
  customer_phone?: string; // New field
  completion_time?: string; // New field for completed deliveries
  can_submit_feedback?: boolean; // New field
  feedback_submitted?: boolean; // New field
}

interface DeliveryBid {
  bid_id: number;
  order_id: number;
  bid_amount: number;
  bid_time: string;
  is_winning_bid: boolean;
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

export function DeliveryDashboard() {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<Order[]>([]);
  const [myBids, setMyBids] = useState<DeliveryBid[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const [bidAmount, setBidAmount] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Feedback form state
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackOrderId, setFeedbackOrderId] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState<'complaint' | 'compliment'>('compliment');
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackDescription, setFeedbackDescription] = useState('');
  const [feedbackCategories, setFeedbackCategories] = useState<{complaint: string[], compliment: string[]}>({complaint: [], compliment: []});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [availableResponse, bidsResponse, deliveriesResponse, categoriesResponse, complaintsResponse] = await Promise.all([
        api.getAvailableOrders(),
        api.getDeliveryBids(),
        api.getDeliveryDeliveries(),
        api.getDeliveryFeedbackCategories(),
        api.getComplaints()
      ]);

      if (availableResponse.success) {
        setAvailableOrders(availableResponse.orders || []);
      }
      if (bidsResponse.success) {
        setMyBids(bidsResponse.bids || []);
      }
      if (deliveriesResponse.success) {
        setMyDeliveries(deliveriesResponse.deliveries || []);
      }
      if (categoriesResponse.success) {
        setFeedbackCategories(categoriesResponse.categories || {complaint: [], compliment: []});
      }
      if (complaintsResponse.success) {
        setComplaints(complaintsResponse.complaints || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (orderId: number) => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setError('Please enter a valid bid amount');
      return;
    }

    try {
      // Note: bidAmount must be a number
      const response = await api.placeDeliveryBid(orderId, parseFloat(bidAmount));
      if (response.success) {
        setSuccess('Bid placed successfully!');
        setBidAmount('');
        setSelectedOrderId(null);
        loadData(); // Refresh lists
      } else {
        setError(response.message || 'Failed to place bid');
      }
    } catch (err) {
      setError('Failed to place bid');
    }
  };

  const handleUpdateDeliveryStatus = async (orderId: number, newStatus: string) => {
    try {
      const response = await api.updateDeliveryStatus(orderId, newStatus);
      if (response.success) {
        setSuccess(`Delivery status updated to ${newStatus}!`);
        loadData(); // Refresh list
      } else {
        setError(response.message || 'Failed to update delivery status');
      }
    } catch (err) {
      setError('Failed to update delivery status');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackOrderId || !feedbackCategory || !feedbackDescription.trim()) {
      setError('Please fill in all feedback fields');
      return;
    }

    try {
      const response = await api.submitDeliveryCustomerFeedback({
        order_id: feedbackOrderId,
        feedback_type: feedbackType,
        category: feedbackCategory,
        description: feedbackDescription.trim()
      });

      if (response.success) {
        setSuccess('Feedback submitted successfully!');
        setShowFeedbackForm(false);
        setFeedbackOrderId(null);
        setFeedbackCategory('');
        setFeedbackDescription('');
        loadData(); // Refresh to show feedback submitted
      } else {
        setError(response.message || 'Failed to submit feedback');
      }
    } catch (err) {
      setError('Failed to submit feedback');
    }
  };

  const openFeedbackForm = (orderId: number) => {
    setFeedbackOrderId(orderId);
    setShowFeedbackForm(true);
  };

  const handleLogout = () => {
    api.logout();
    navigate('/employee/login');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ready for Delivery': return <Badge className="bg-blue-500 text-white">Ready</Badge>;
      case 'In Transit': return <Badge className="bg-orange-500 text-white">On The Way</Badge>;
      case 'Delivered': return <Badge className="bg-green-500 text-white">Delivered</Badge>;
      default: return <Badge variant="secondary" className="text-white">{status}</Badge>;
    }
  };

  if (loading && availableOrders.length === 0 && myDeliveries.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <div className="bg-[#0f1f3a] border-b border-[#00ff88]/20 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-[#00ff88]" />
            <div>
              <h1 className="text-2xl font-bold">Delivery Dashboard</h1>
              <p className="text-white/70">Order Delivery & Bidding System</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10">
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && <Alert className="mb-6 border-red-500/50 bg-red-500/10"><AlertDescription className="text-red-400">{error}</AlertDescription></Alert>}
        {success && <Alert className="mb-6 border-green-500/50 bg-green-500/10"><AlertDescription className="text-green-400">{success}</AlertDescription></Alert>}

        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="bg-[#0f1f3a] border border-[#00ff88]/20 w-full justify-start">
            <TabsTrigger value="available" className="flex-1 data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">Available Orders</TabsTrigger>
            <TabsTrigger value="deliveries" className="flex-1 data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">My Deliveries</TabsTrigger>
            <TabsTrigger value="bids" className="flex-1 data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">My Bids</TabsTrigger>
            <TabsTrigger value="complaints" className="flex-1 data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">Complaints</TabsTrigger>
          </TabsList>

          {/* Available Orders Tab */}
          <TabsContent value="available">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <div className="flex justify-between mb-4">
                    <h2 className="text-xl font-semibold">Available for Pickup</h2>
                    <Button size="sm" variant="outline" onClick={loadData} className="border-[#00ff88]/30 text-white">Refresh</Button>
                </div>
                {availableOrders.length === 0 ? (
                    <div className="text-center py-8 text-white/50">No orders currently ready for delivery.</div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#00ff88]/20">
                      <TableHead className="text-white h-12 align-middle w-1/6 text-left">Order #</TableHead>
                      <TableHead className="text-white h-12 align-middle w-1/4 text-left">Customer</TableHead>
                      <TableHead className="text-white h-12 align-middle w-1/4 text-left">Address</TableHead>
                      <TableHead className="text-white h-12 align-middle w-1/6 text-center">Status</TableHead>
                      <TableHead className="text-white h-12 align-middle w-1/6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableOrders.map((order) => (
                      <TableRow key={order.order_id} className="border-[#00ff88]/10 h-16">
                        <TableCell className="text-white align-middle text-left">#{order.order_id}</TableCell>
                        <TableCell className="text-white align-middle text-left">{order.customer_name}</TableCell>
                        
                        <TableCell className="align-middle text-center">{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="align-middle text-right">
                          <Button size="sm" onClick={() => setSelectedOrderId(order.order_id)} className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]">
                            <DollarSign className="w-4 h-4 mr-1" /> Bid
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* My Deliveries Tab */}
          <TabsContent value="deliveries">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <div className="flex justify-between mb-4">
                  <h2 className="text-xl font-semibold">My Deliveries</h2>
                  <Button size="sm" variant="outline" onClick={loadData} className="border-[#00ff88]/30 text-white">Refresh</Button>
                </div>
                
                {myDeliveries.length === 0 ? (
                  <div className="text-center py-8 text-white/50">You have no deliveries. Go place a bid!</div>
                ) : (
                  <div className="space-y-4">
                    {/* Current Deliveries */}
                    {myDeliveries.filter(order => order.status === 'In Transit').length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-[#00ff88]">Current Deliveries</h3>
                        <div className="grid gap-4">
                          {myDeliveries.filter(order => order.status === 'In Transit').map((order) => (
                            <Card key={order.order_id} className="bg-[#1a2f4a] p-4 border border-[#00ff88]/10">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="font-bold text-white text-lg">Order #{order.order_id}</h3>
                                  <div className="flex items-center gap-2 text-white/70 mt-1">
                                    <MapPin className="w-4 h-4 text-[#00ff88]" />
                                    <span>{order.customer_address}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-white/70 mt-1">
                                    <Package className="w-4 h-4 text-[#00ff88]" />
                                    <span>{order.customer_name}</span>
                                    {order.customer_phone && (
                                      <span className="text-sm text-white/50">({order.customer_phone})</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  {getStatusBadge(order.status)}
                                  <Button size="sm" onClick={() => handleUpdateDeliveryStatus(order.order_id, 'Delivered')} className="bg-green-600 hover:bg-green-700 text-white">
                                    <CheckCircle className="w-4 h-4 mr-1" /> Confirm Delivery
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completed Deliveries */}
                    {myDeliveries.filter(order => order.status === 'Delivered').length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-[#00ff88]">Recent Completed Deliveries</h3>
                        <div className="grid gap-4">
                          {myDeliveries.filter(order => order.status === 'Delivered').map((order) => (
                            <Card key={order.order_id} className="bg-[#1a2f4a] p-4 border border-[#00ff88]/10">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="font-bold text-white text-lg">Order #{order.order_id}</h3>
                                  <div className="flex items-center gap-2 text-white/70 mt-1">
                                    <MapPin className="w-4 h-4 text-[#00ff88]" />
                                    <span>{order.customer_address}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-white/70 mt-1">
                                    <Package className="w-4 h-4 text-[#00ff88]" />
                                    <span>{order.customer_name}</span>
                                    {order.customer_phone && (
                                      <span className="text-sm text-white/50">({order.customer_phone})</span>
                                    )}
                                  </div>
                                  {order.completion_time && (
                                    <div className="flex items-center gap-2 text-white/50 mt-1">
                                      <Clock className="w-4 h-4" />
                                      <span>Completed: {new Date(order.completion_time).toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  {getStatusBadge(order.status)}
                                  {order.can_submit_feedback && !order.feedback_submitted && (
                                    <Button size="sm" onClick={() => openFeedbackForm(order.order_id)} className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]">
                                      <MessageSquare className="w-4 h-4 mr-1" /> Submit Feedback
                                    </Button>
                                  )}
                                  {order.feedback_submitted && (
                                    <Badge className="bg-green-500 text-white">
                                      <Star className="w-3 h-3 mr-1" /> Feedback Submitted
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* My Bids Tab */}
          <TabsContent value="bids">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">My Bid History</h2>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#00ff88]/20">
                      <TableHead className="text-white h-12 align-middle text-left w-1/4">Order #</TableHead>
                      <TableHead className="text-white h-12 align-middle text-left w-1/4">Bid Amount</TableHead>
                      <TableHead className="text-white h-12 align-middle text-left w-1/4">Time</TableHead>
                      <TableHead className="text-white h-12 align-middle text-center w-1/4">Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myBids.map((bid) => (
                      <TableRow key={bid.bid_id} className="border-[#00ff88]/10 h-16">
                        <TableCell className="text-white align-middle text-left">#{bid.order_id}</TableCell>
                        <TableCell className="text-white align-middle text-left">${bid.bid_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-white align-middle text-left">{new Date(bid.bid_time).toLocaleString()}</TableCell>
                        <TableCell className="align-middle text-center">
                          {bid.is_winning_bid ? <Badge className="bg-green-500 text-white">Won</Badge> : <Badge variant="secondary" className="text-white">Pending</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                    onClick={loadData}
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
                      onAppealSubmitted={loadData}
                    />
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Place Bid Modal */}
        {selectedOrderId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20 max-w-md w-full">
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Place Delivery Bid</h3>
                <p className="text-white/70 mb-4">Enter your fee for Order #{selectedOrderId}</p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bid-amount" className="text-white">Delivery Fee ($)</Label>
                    <Input id="bid-amount" type="number" step="0.5" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="bg-[#1a2a3a] border-[#00ff88]/30 text-white" required />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handlePlaceBid(selectedOrderId)} className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628] flex-1">Place Bid</Button>
                    <Button onClick={() => { setSelectedOrderId(null); setBidAmount(''); }} variant="outline" className="border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10">Cancel</Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Feedback Form Modal */}
        {showFeedbackForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20 max-w-lg w-full">
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Submit Customer Feedback</h3>
                <p className="text-white/70 mb-4">Share your experience with the customer for Order #{feedbackOrderId}</p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Feedback Type</Label>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        type="button" 
                        variant={feedbackType === 'compliment' ? 'default' : 'outline'} 
                        onClick={() => setFeedbackType('compliment')}
                        className={feedbackType === 'compliment' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10'}
                      >
                        <Star className="w-4 h-4 mr-1" /> Compliment
                      </Button>
                      <Button 
                        type="button" 
                        variant={feedbackType === 'complaint' ? 'default' : 'outline'} 
                        onClick={() => setFeedbackType('complaint')}
                        className={feedbackType === 'complaint' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10'}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" /> Complaint
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="feedback-category" className="text-white">Category</Label>
                    <select 
                      id="feedback-category" 
                      value={feedbackCategory} 
                      onChange={(e) => setFeedbackCategory(e.target.value)}
                      className="w-full mt-2 bg-white border border-gray-300 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00ff88] focus:border-transparent"
                      style={{ color: 'white' }}
                      required
                    >
                      <option value="" style={{ color: 'white', backgroundColor: 'white' }}>Select a category...</option>
                      {feedbackCategories[feedbackType]?.map((category) => (
                        <option key={category} value={category} style={{ color: 'black', backgroundColor: 'white' }}>
                          {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="feedback-description" className="text-white">Description</Label>
                    <textarea 
                      id="feedback-description" 
                      value={feedbackDescription} 
                      onChange={(e) => setFeedbackDescription(e.target.value)}
                      placeholder="Please provide details about your experience..."
                      className="w-full mt-2 bg-[#1a2a3a] border border-[#00ff88]/30 rounded px-3 py-2 text-white min-h-[100px] resize-none"
                      required
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleSubmitFeedback} className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628] flex-1">
                      Submit Feedback
                    </Button>
                    <Button 
                      onClick={() => { 
                        setShowFeedbackForm(false); 
                        setFeedbackOrderId(null); 
                        setFeedbackCategory(''); 
                        setFeedbackDescription(''); 
                      }} 
                      variant="outline" 
                      className="border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}