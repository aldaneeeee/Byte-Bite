import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Truck, MapPin, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';

interface Order {
  order_id: number;
  customer_id: number;
  status: string;
  total_price: number;
  order_time: string;
  customer_name?: string;
  customer_address?: string;
}

interface DeliveryBid {
  bid_id: number;
  order_id: number;
  bid_amount: number;
  bid_time: string;
  is_winning_bid: boolean;
}

export function DeliveryDashboard() {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<Order[]>([]);
  const [myBids, setMyBids] = useState<DeliveryBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Bid form
  const [bidAmount, setBidAmount] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [availableResponse, bidsResponse, deliveriesResponse] = await Promise.all([
        api.getAvailableOrders(),
        api.getDeliveryBids(),
        api.getDeliveryDeliveries()
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
    } catch (err) {
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
      const response = await api.placeDeliveryBid(orderId, parseFloat(bidAmount));
      if (response.success) {
        setSuccess('Bid placed successfully!');
        setBidAmount('');
        setSelectedOrderId(null);
        loadData();
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
        loadData();
      } else {
        setError(response.message || 'Failed to update delivery status');
      }
    } catch (err) {
      setError('Failed to update delivery status');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('employeeToken');
    localStorage.removeItem('employeeData');
    navigate('/employee/login');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ready for Delivery':
        return <Badge className="bg-blue-500">Ready</Badge>;
      case 'In Transit':
        return <Badge className="bg-yellow-500">In Transit</Badge>;
      case 'Delivered':
        return <Badge className="bg-green-500">Delivered</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
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

        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="bg-[#0f1f3a] border border-[#00ff88]/20">
            <TabsTrigger value="available" className="data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
              Available Orders
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
              My Deliveries
            </TabsTrigger>
            <TabsTrigger value="bids" className="data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
              My Bids
            </TabsTrigger>
          </TabsList>

          {/* Available Orders Tab */}
          <TabsContent value="available">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Available Orders for Delivery</h2>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#00ff88]/20">
                      <TableHead className="text-white">Order #</TableHead>
                      <TableHead className="text-white">Customer</TableHead>
                      <TableHead className="text-white">Address</TableHead>
                      <TableHead className="text-white">Value</TableHead>
                      <TableHead className="text-white">Time</TableHead>
                      <TableHead className="text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableOrders.map((order) => (
                      <TableRow key={order.order_id} className="border-[#00ff88]/10">
                        <TableCell className="text-white">#{order.order_id}</TableCell>
                        <TableCell className="text-white">{order.customer_name}</TableCell>
                        <TableCell className="text-white max-w-xs truncate">{order.customer_address}</TableCell>
                        <TableCell className="text-white">${order.total_price.toFixed(2)}</TableCell>
                        <TableCell className="text-white">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(order.order_time).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => setSelectedOrderId(order.order_id)}
                            className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Place Bid
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* My Deliveries Tab */}
          <TabsContent value="deliveries">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">My Active Deliveries</h2>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#00ff88]/20">
                      <TableHead className="text-white">Order #</TableHead>
                      <TableHead className="text-white">Customer</TableHead>
                      <TableHead className="text-white">Address</TableHead>
                      <TableHead className="text-white">Value</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myDeliveries.map((order) => (
                      <TableRow key={order.order_id} className="border-[#00ff88]/10">
                        <TableCell className="text-white">#{order.order_id}</TableCell>
                        <TableCell className="text-white">{order.customer_name}</TableCell>
                        <TableCell className="text-white max-w-xs truncate">{order.customer_address}</TableCell>
                        <TableCell className="text-white">${order.total_price.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {order.status === 'In Transit' && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateDeliveryStatus(order.order_id, 'Delivered')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Mark Delivered
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#00ff88]/30 text-white hover:bg-[#00ff88]/10"
                            >
                              <MapPin className="w-4 h-4 mr-1" />
                              View Route
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

          {/* My Bids Tab */}
          <TabsContent value="bids">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">My Delivery Bids</h2>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#00ff88]/20">
                      <TableHead className="text-white">Order #</TableHead>
                      <TableHead className="text-white">Bid Amount</TableHead>
                      <TableHead className="text-white">Bid Time</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myBids.map((bid) => (
                      <TableRow key={bid.bid_id} className="border-[#00ff88]/10">
                        <TableCell className="text-white">#{bid.order_id}</TableCell>
                        <TableCell className="text-white">${bid.bid_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-white">
                          {new Date(bid.bid_time).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {bid.is_winning_bid ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Won
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <p className="text-white/70 mb-4">
                  Enter your delivery fee for Order #{selectedOrderId}
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bid-amount" className="text-white">Delivery Fee ($)</Label>
                    <Input
                      id="bid-amount"
                      type="number"
                      step="0.01"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="bg-[#1a2a3a] border-[#00ff88]/30 text-white"
                      placeholder="2.50"
                      min="0"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePlaceBid(selectedOrderId)}
                      className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628] flex-1"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Place Bid
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedOrderId(null);
                        setBidAmount('');
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