import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Users, ChefHat, Truck, UserCheck, UserX, Crown } from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  reputation_score: number;
}

interface Customer {
  id: number;
  username: string;
  email: string;
  balance: number;
  warning_count: number;
  order_count: number;
  is_vip: boolean;
  is_blacklisted: boolean;
}

export function ManagerDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Hire employee form
  const [hireForm, setHireForm] = useState({
    name: '',
    email: '',
    password: '',
    role: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('ManagerDashboard: Loading data...');
    try {
      setLoading(true);
      console.log('ManagerDashboard: Calling getEmployees and getAllCustomers');
      const [employeesRes, customersRes] = await Promise.all([
        api.getEmployees(),
        api.getAllCustomers()
      ]);
      console.log('ManagerDashboard: API responses received', { employeesRes, customersRes });

      if (employeesRes.success) {
        setEmployees(employeesRes.employees);
      }
      if (customersRes.success) {
        setCustomers(customersRes.customers);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleHireEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.hireEmployee(hireForm);
      if (response.success) {
        setSuccess('Employee hired successfully');
        setHireForm({ name: '', email: '', password: '', role: '' });
        loadData(); // Refresh data
      } else {
        setError(response.message || 'Failed to hire employee');
      }
    } catch (err) {
      setError('Failed to hire employee');
    }
  };

  const handleEmployeeAction = async (employeeId: number, action: string) => {
    try {
      const response = await api.updateEmployee(employeeId, action);
      if (response.success) {
        setSuccess(`Employee ${action}d successfully`);
        loadData(); // Refresh data
      } else {
        setError(response.message || `Failed to ${action} employee`);
      }
    } catch (err) {
      setError(`Failed to ${action} employee`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('employeeToken');
    localStorage.removeItem('employeeData');
    navigate('/employee/login');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Chef': return <ChefHat className="w-4 h-4" />;
      case 'Delivery': return <Truck className="w-4 h-4" />;
      case 'Manager': return <Users className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <Badge className="bg-green-500">Active</Badge>;
      case 'Fired': return <Badge className="bg-red-500">Fired</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
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
            <Users className="w-8 h-8 text-[#00ff88]" />
            <div>
              <h1 className="text-2xl font-bold">Manager Dashboard</h1>
              <p className="text-white/70">Human Resources & System Management</p>
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

        <Tabs defaultValue="employees" className="space-y-6">
          <TabsList className="bg-[#0f1f3a] border border-[#00ff88]/20">
            <TabsTrigger value="employees" className="data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
              Employee Management
            </TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
              Customer Overview
            </TabsTrigger>
            <TabsTrigger value="hire" className="data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
              Hire Employee
            </TabsTrigger>
          </TabsList>

          {/* Employee Management Tab */}
          <TabsContent value="employees">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Employee Management</h2>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#00ff88]/20">
                      <TableHead className="text-white">Name</TableHead>
                      <TableHead className="text-white">Role</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white">Reputation</TableHead>
                      <TableHead className="text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id} className="border-[#00ff88]/10">
                        <TableCell className="text-white">{employee.name}</TableCell>
                        <TableCell className="text-white">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(employee.role)}
                            {employee.role}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(employee.status)}</TableCell>
                        <TableCell className="text-white">{employee.reputation_score}/5.0</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {employee.status === 'Active' ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleEmployeeAction(employee.id, 'promote')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Promote
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleEmployeeAction(employee.id, 'fire')}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Fire
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleEmployeeAction(employee.id, 'activate')}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Customer Overview Tab */}
          <TabsContent value="customers">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Customer Overview</h2>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#00ff88]/20">
                      <TableHead className="text-white">Username</TableHead>
                      <TableHead className="text-white">Email</TableHead>
                      <TableHead className="text-white">Balance</TableHead>
                      <TableHead className="text-white">Orders</TableHead>
                      <TableHead className="text-white">Warnings</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id} className="border-[#00ff88]/10">
                        <TableCell className="text-white">{customer.username}</TableCell>
                        <TableCell className="text-white">{customer.email}</TableCell>
                        <TableCell className="text-white">${customer.balance.toFixed(2)}</TableCell>
                        <TableCell className="text-white">{customer.order_count}</TableCell>
                        <TableCell className="text-white">{customer.warning_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {customer.is_vip && <Badge className="bg-yellow-500"><Crown className="w-3 h-3 mr-1" />VIP</Badge>}
                            {customer.is_blacklisted && <Badge className="bg-red-500">Blacklisted</Badge>}
                            {!customer.is_blacklisted && !customer.is_vip && <Badge variant="secondary">Regular</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Hire Employee Tab */}
          <TabsContent value="hire">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Hire New Employee</h2>
                <form onSubmit={handleHireEmployee} className="space-y-4 max-w-md">
                  <div>
                    <Label htmlFor="name" className="text-white">Full Name</Label>
                    <Input
                      id="name"
                      value={hireForm.name}
                      onChange={(e) => setHireForm({...hireForm, name: e.target.value})}
                      className="bg-[#1a2a3a] border-[#00ff88]/30 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-white">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={hireForm.email}
                      onChange={(e) => setHireForm({...hireForm, email: e.target.value})}
                      className="bg-[#1a2a3a] border-[#00ff88]/30 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-white">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={hireForm.password}
                      onChange={(e) => setHireForm({...hireForm, password: e.target.value})}
                      className="bg-[#1a2a3a] border-[#00ff88]/30 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="role" className="text-white">Role</Label>
                    <Select value={hireForm.role} onValueChange={(value) => setHireForm({...hireForm, role: value})}>
                      <SelectTrigger className="bg-[#1a2a3a] border-[#00ff88]/30 text-white">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2a3a] border-[#00ff88]/30">
                        <SelectItem value="Chef" className="text-white">Chef</SelectItem>
                        <SelectItem value="Delivery" className="text-white">Delivery Person</SelectItem>
                        <SelectItem value="Manager" className="text-white">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a1628]">
                    Hire Employee
                  </Button>
                </form>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}