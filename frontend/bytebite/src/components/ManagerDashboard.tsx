import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea'; // 新增引用
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  Users, ChefHat, Truck, Crown, Edit, Trash2, Plus, X, Search, 
  DollarSign, Clock, Gavel, FileText, ArrowUpRight, ArrowDownLeft,
  Brain, Star, MessageSquare, // 新增图标
  Flag
} from 'lucide-react';

// Interfaces
interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  reputation_score: number;
  complaint_count: number;
  demotion_count: number;
}

interface Customer {
  id: number;
  username: string;
  email: string;
  balance: number;
  deposited_cash: number;
  phone_number: string;
  warning_count: number;
  order_count: number;
  is_vip: boolean;
  is_blacklisted: boolean;
}

interface BidInfo {
    bid_id: number;
    employee_id: number;
    employee_name: string;
    bid_amount: number;
    bid_time: string;
}

interface BiddingSession {
    bidding_id: number;
    order_id: number;
    start_time: string;
    remaining_seconds: number;
    order_total: number;
    bids: BidInfo[];
}

interface FinancialLog {
    log_id: number;
    customer_name: string;
    customer_email: string;
    type: 'Deposit' | 'Order';
    amount: number;
    order_id?: number;
    created_at: string;
}

interface RegistrationRequest {
    request_id: number;
    username: string;
    email: string;
    phone_number: string;
    created_at: string;
}

// 👇👇👇 新增 KB 接口 👇👇👇
interface KBEntry {
  id: number;
  question: string;
  answer: string;
  author: string;
  avg_rating: number;
  rating_count: number;
  created_at: string;
}

interface ForumReport {
    report_id: number;
    reporter_name: string;
    content_type: 'post' | 'comment';
    content_info: {
        title?: string;
        content: string;
        author: string;
    };
    reason: string;
    status: 'pending' | 'reviewed' | 'resolved' | 'notified' | 'appealed' | 'repealed' | 'upheld';
    created_at: string;
    reviewed_at?: string;
    reviewed_by?: string;
    appealed_at?: string;
    appeal_message?: string;
}

interface Complaint {
    complaint_id: number;
    complainant_name: string;
    complainant_type: string;
    accused_name: string;
    accused_type: string;
    complaint_type: string;
    category: string;
    description: string;
    related_order_id?: number;
    status: string;
    created_at: string;
    reviewed_at?: string;
    dispute_reason?: string;
    appeal_message?: string;
    appealed_at?: string;
}

export function ManagerDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [biddings, setBiddings] = useState<BiddingSession[]>([]);
  const [financialLogs, setFinancialLogs] = useState<FinancialLog[]>([]);
  const [forumReports, setForumReports] = useState<ForumReport[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [deliveryStaff, setDeliveryStaff] = useState<Employee[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>([]);
  
  // 👇👇👇 新增 KB State 👇👇👇
  const [kbEntries, setKbEntries] = useState<KBEntry[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [loadingKB, setLoadingKB] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // --- Modal States ---
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedBidding, setSelectedBidding] = useState<BiddingSession | null>(null);

  // --- Forms ---
  const [empForm, setEmpForm] = useState({
    id: 0,
    name: '',
    email: '',
    password: '',
    role: 'Chef'
  });

  const [custForm, setCustForm] = useState({
    id: 0,
    username: '',
    email: '',
    phone_number: '',
    deposited_cash: 0,
    is_blacklisted: false
  });

  const [assignForm, setAssignForm] = useState({
      employee_id: '',
      memo: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // 👇👇👇 增加 getKnowledgeBase 调用 👇👇👇
      const [employeesRes, customersRes, biddingsRes, financialsRes, kbRes, reportsRes, complaintsRes, registrationRes] = await Promise.allSettled([
        api.getEmployees(),
        api.getAllCustomers(),
        api.getManagerBiddings(),
        api.getFinancialLogs(),
        api.getKnowledgeBase(), // 获取 AI 知识库
        api.getForumReports(),
        api.getComplaints(),
        api.getRegistrationRequests()
        
      ]);

      if (employeesRes.status === 'fulfilled' && employeesRes.value.success) {
          setEmployees(employeesRes.value.employees);
          setDeliveryStaff(employeesRes.value.employees.filter((e: Employee) => e.role === 'Delivery'));
      } else if (employeesRes.status === 'rejected') {
          console.error('Failed to load employees:', employeesRes.reason);
      }
      if (customersRes.status === 'fulfilled' && customersRes.value.success) setCustomers(customersRes.value.customers);
      else if (customersRes.status === 'rejected') console.error('Failed to load customers:', customersRes.reason);
      if (biddingsRes.status === 'fulfilled' && biddingsRes.value.success) setBiddings(biddingsRes.value.biddings);
      else if (biddingsRes.status === 'rejected') console.error('Failed to load biddings:', biddingsRes.reason);
      if (financialsRes.status === 'fulfilled' && financialsRes.value.success) setFinancialLogs(financialsRes.value.logs);
      else if (financialsRes.status === 'rejected') console.error('Failed to load financial logs:', financialsRes.reason);
      if (reportsRes.status === 'fulfilled' && reportsRes.value.success) {
          setForumReports(reportsRes.value.reports);
          console.log('Loaded forum reports:', reportsRes.value.reports);
      } else if (reportsRes.status === 'rejected') {
          console.error('Failed to load forum reports:', reportsRes.reason);
      }
      if (complaintsRes.status === 'fulfilled' && complaintsRes.value.success) {
          setComplaints(complaintsRes.value.complaints);
          console.log('Loaded complaints:', complaintsRes.value.complaints);
      } else if (complaintsRes.status === 'rejected') {
          console.error('Failed to load complaints:', complaintsRes.reason);
      }
      if (kbRes.status === 'fulfilled' && kbRes.value.success) {
          setKbEntries(kbRes.value.entries);
      } else if (kbRes.status === 'rejected') {
          console.error('Failed to load knowledge base:', kbRes.reason);
      }
      if (registrationRes.status === 'fulfilled' && registrationRes.value.success) {
          setRegistrationRequests(registrationRes.value.requests);
      } else if (registrationRes.status === 'rejected') {
          console.error('Failed to load registration requests:', registrationRes.reason);
      }
      
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // 👇👇👇 新增: 添加 Knowledge 处理函数 👇👇👇
  const handleAddKB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setLoadingKB(true);
    try {
      const res = await api.addKnowledgeEntry(newQuestion, newAnswer);
      if (res.success) {
        setSuccess("Knowledge added successfully!");
        setNewQuestion('');
        setNewAnswer('');
        // 单独刷新 KB 列表
        const kbRes = await api.getKnowledgeBase();
        if(kbRes.success) setKbEntries(kbRes.entries);
      } else {
        setError("Failed to add entry");
      }
    } catch (e) {
      setError("Error connecting to server");
    } finally {
      setLoadingKB(false);
    }
  };

  const handleDeleteKB = async (kbId: number) => {
    if (!confirm('Are you sure you want to delete this knowledge entry? This action cannot be undone.')) return;

    try {
      const res = await api.deleteKnowledgeEntry(kbId);
      if (res.success) {
        setSuccess("Knowledge entry deleted successfully!");
        // 刷新 KB 列表
        const kbRes = await api.getKnowledgeBase();
        if(kbRes.success) setKbEntries(kbRes.entries);
      } else {
        setError("Failed to delete entry");
      }
    } catch (e) {
      setError("Error connecting to server");
    }
  };

  // --- Existing Handlers ---
  const openCreateEmployee = () => { setIsEditing(false); setEmpForm({ id: 0, name: '', email: '', password: '', role: 'Chef' }); setShowEmployeeModal(true); };
  const openEditEmployee = (emp: Employee) => { setIsEditing(true); setEmpForm({ id: emp.id, name: emp.name, email: emp.email, password: '', role: emp.role }); setShowEmployeeModal(true); };
  
  const handleEmployeeSubmit = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      try { 
          let response; 
          if (isEditing) { 
              response = await api.updateEmployeeInfo(empForm.id, { name: empForm.name, email: empForm.email, role: empForm.role }); 
          } else { 
              response = await api.hireEmployee(empForm); 
          } 
          if (response.success) { 
              setSuccess(isEditing ? 'Employee updated' : 'Employee hired'); 
              setShowEmployeeModal(false); 
              loadData(); 
          } else { 
              setError(response.message); 
          } 
      } catch (err) { 
          setError('Operation failed'); 
      } 
  };

  const handleEmployeeStatus = async (id: number, action: string) => { 
      try { 
          const res = await api.updateEmployee(id, action); 
          if (res.success) loadData(); 
      } catch(e) { setError('Failed'); } 
  };

  const handleDeleteEmployee = async (id: number) => { 
      if(confirm("Delete this employee?")) { 
          try { 
              const res = await api.deleteEmployee(id); 
              if(res.success) loadData(); 
          } catch(e) { setError('Failed'); } 
      } 
  };

  const openEditCustomer = (cust: Customer) => { 
      setCustForm({ 
          id: cust.id, 
          username: cust.username, 
          email: cust.email, 
          phone_number: cust.phone_number, 
          deposited_cash: cust.balance, 
          is_blacklisted: cust.is_blacklisted 
      }); 
      setShowCustomerModal(true); 
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      try { 
          const response = await api.updateCustomerManager(custForm.id, { 
              username: custForm.username, 
              email: custForm.email, 
              phone_number: custForm.phone_number, 
              deposited_cash: parseFloat(custForm.deposited_cash.toString()), 
              is_blacklisted: custForm.is_blacklisted 
          }); 
          if(response.success) { 
              setSuccess("Customer updated"); 
              setShowCustomerModal(false); 
              loadData(); 
          } else { 
              setError(response.message); 
          } 
      } catch(err) { setError("Failed"); } 
  };

  const handleDeleteCustomer = async (id: number) => { 
      if(confirm("Delete this customer?")) { 
          try { 
              const res = await api.deleteCustomerManager(id); 
              if(res.success) loadData(); 
          } catch(e) { setError('Failed'); } 
      } 
  };

  // Toggle VIP status
  const handleToggleVIP = async (customerId: number, promote: boolean) => {
    try {
      const res = await api.updateCustomerVIP(customerId, promote); // API call to promote/demote VIP
      if (res.success) {
        setSuccess(promote ? "Customer promoted to VIP!" : "VIP removed!");
        loadData(); // refresh customers
      } else {
        setError(res.message || "Failed to update VIP status");
      }
    } catch (e) {
      setError("Error updating VIP status");
    }
  };

  // Add a warning to the customer
  const handleAddWarning = async (customerId: number) => {
    try {
      const res = await api.addCustomerWarning(customerId); // API call to add warning
      if (res.success) {
        setSuccess("Warning added to customer");
        loadData(); // refresh customers
      } else {
        setError(res.message || "Failed to add warning");
      }
    } catch (e) {
      setError("Error adding warning");
    }
  };

  const handleUpdateReportStatus = async (reportId: number, status: string) => {
      try {
          const res = await api.updateReportStatus(reportId, status);
          if(res.success) {
              loadData();
              setSuccess(`Report ${status}`);
          }
      } catch(e) { setError('Failed to update report status'); }
  };

  const handleNotifyAccused = async (complaintId: number) => {
      try {
          // First notify the accused party
          const notifyRes = await api.notifyComplaintAccused(complaintId);
          if(notifyRes.success) {
              // Then update complaint status to notified
              const updateRes = await api.updateComplaintStatus(complaintId, 'notified');
              if(updateRes.success) {
                  loadData();
                  setSuccess('Accused party notified about the complaint');
              } else {
                  setError('Failed to update complaint status');
              }
          } else {
              setError(notifyRes.message || 'Failed to notify accused party');
          }
      } catch(e) { setError('Failed to notify accused party'); }
  };

  const handleReviewComplaint = async (complaintId: number, decision: string) => {
      try {
          const res = await api.reviewComplaint(complaintId.toString(), { decision, manager_decision: 'Reviewed by manager' });
          if(res.success) {
              loadData();
              setSuccess(`Complaint ${decision}`);
          } else {
              setError(res.message || 'Failed to review complaint');
          }
      } catch(e) { setError('Failed to review complaint'); }
  };

  const handleReviewAppeal = async (complaintId: number, decision: string) => {
      try {
          const res = await api.reviewAppeal(complaintId, { decision, review_notes: `Appeal ${decision} by manager` });
          if(res.success) {
              loadData();
              setSuccess(`Appeal ${decision}`);
          } else {
              setError(res.message || 'Failed to review appeal');
          }
      } catch(e) { setError('Failed to review appeal'); }
  };

  const handleReviewForumAppeal = async (reportId: number, decision: string) => {
      try {
          const res = await api.reviewForumAppeal(reportId, { decision });
          if(res.success) {
              loadData();
              setSuccess(`Forum appeal ${decision}ed`);
          } else {
              setError(res.message || 'Failed to review forum appeal');
          }
      } catch(e) { setError('Failed to review forum appeal'); }
  };

  const handleReviewRegistrationRequest = async (requestId: number, action: string) => {
    try {
      let denialReason = '';
      if (action === 'deny') {
        denialReason = prompt('Enter denial reason (optional):') || '';
      }
      
      const res = await api.reviewRegistrationRequest(requestId, action, denialReason);
      if (res.success) {
        setSuccess(`Registration request ${action}d successfully`);
        loadData();
      } else {
        setError(res.message || 'Failed to review registration request');
      }
    } catch (err) {
      setError('Failed to review registration request');
    }
  };

  const handleOpenAssign = (b: BiddingSession) => { setSelectedBidding(b); setAssignForm({ employee_id: '', memo: '' }); setAssignModalOpen(true); };
  
  const handleAssignSubmit = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if(!selectedBidding) return; 
      if (!assignForm.memo.trim()) {
          setError("Memo is required when manually assigning orders");
          return;
      }
      try { 
          const res = await api.managerAssignOrder({ 
              bidding_id: selectedBidding.bidding_id, 
              employee_id: parseInt(assignForm.employee_id), 
              memo: assignForm.memo 
          }); 
          if (res.success) { 
              setSuccess("Assigned"); 
              setAssignModalOpen(false); 
              loadData(); 
          } 
      } catch (err) { setError("Failed"); } 
  };

  const formatTime = (seconds: number) => { if (seconds <= 0) return "Expired"; const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

  const handleLogout = () => {
    api.logout();
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
      case 'Active': return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'Fired': return <Badge className="bg-red-500 text-white">Fired</Badge>;
      default: return <Badge variant="secondary" className="text-white">{status}</Badge>;
    }
  };

  if (loading && employees.length === 0) {
    return <div className="min-h-screen bg-[#0a1628] flex items-center justify-center"><div className="text-white">Loading...</div></div>;
  }

  const filteredCustomers = customers.filter(c =>
    c.username.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
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
        {error && <Alert className="mb-6 border-red-500/50 bg-red-500/10"><AlertDescription className="text-red-400">{error}</AlertDescription></Alert>}
        {success && <Alert className="mb-6 border-green-500/50 bg-green-500/10"><AlertDescription className="text-green-400">{success}</AlertDescription></Alert>}

        <Tabs defaultValue="financials" className="space-y-6">
          <TabsList className="bg-[#0f1f3a] border border-[#00ff88]/20 w-full justify-start h-auto flex-wrap gap-2 p-2">
            <TabsTrigger value="financials" className="flex-1 data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
               <FileText className="w-4 h-4 mr-2"/> Financial Audit
            </TabsTrigger>
            <TabsTrigger value="biddings" className="flex-1 data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
               Delivery Bidding
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex-1 data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
               Employee Accounts
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex-1 data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
               Customer Accounts
            </TabsTrigger>
            {/* 👇👇👇 新增 Tab: AI Brain 👇👇👇 */}
            <TabsTrigger value="ai-brain" className="flex-1 data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
               <Brain className="w-4 h-4 mr-2"/> AI Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
               <Flag className="w-4 h-4 mr-2"/> Reports
            </TabsTrigger>
            <TabsTrigger value="registration" className="flex-1 data-[state=active]:bg-[#00ff88] data-[state=active]:text-[#0a1628]">
               <Users className="w-4 h-4 mr-2"/> Registration Requests
            </TabsTrigger>
          </TabsList>

          {/* --- Tab: Financial Audit --- */}
          <TabsContent value="financials">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Transaction Logs</h2>
                    <Button onClick={loadData} size="sm" variant="outline" className="border-[#00ff88]/30 text-white">Refresh</Button>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <Card className="bg-[#1a2f4a] p-4 border border-[#00ff88]/10">
                        <p className="text-white/70 text-sm">Total Revenue</p>
                        <p className="text-2xl font-bold text-[#00ff88]">
                            ${financialLogs.filter(l => l.type === 'Order').reduce((sum, l) => sum + l.amount, 0).toFixed(2)}
                        </p>
                    </Card>
                    <Card className="bg-[#1a2f4a] p-4 border border-[#00ff88]/10">
                        <p className="text-white/70 text-sm">Total Deposits</p>
                        <p className="text-2xl font-bold text-blue-400">
                            ${financialLogs.filter(l => l.type === 'Deposit').reduce((sum, l) => sum + l.amount, 0).toFixed(2)}
                        </p>
                    </Card>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow className="border-[#00ff88]/20">
                        <TableHead className="text-white h-12 align-middle w-1/5">Date</TableHead>
                        <TableHead className="text-white h-12 align-middle w-1/6">Type</TableHead>
                        <TableHead className="text-white h-12 align-middle w-1/4">Customer</TableHead>
                        <TableHead className="text-white h-12 align-middle w-1/4">Details</TableHead>
                        <TableHead className="text-white h-12 align-middle w-1/6 text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {financialLogs.map((log) => (
                        <TableRow key={log.log_id} className="border-[#00ff88]/10 h-16">
                            <TableCell className="text-white text-sm align-middle">
                                {new Date(log.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="align-middle">
                                {log.type === 'Deposit' ? (
                                    <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">
                                        <ArrowDownLeft className="w-3 h-3 mr-1"/> Deposit
                                    </Badge>
                                ) : (
                                    <Badge className="bg-[#00ff88]/20 text-[#00ff88] hover:bg-[#00ff88]/30">
                                        <ArrowUpRight className="w-3 h-3 mr-1"/> Order
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-white align-middle">
                                <div>{log.customer_name}</div>
                                <div className="text-xs text-white/50">{log.customer_email}</div>
                            </TableCell>
                            <TableCell className="text-white/70 text-sm align-middle">
                                {log.order_id ? `Order #${log.order_id}` : 'Wallet Top-up'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-white align-middle">
                                ${log.amount.toFixed(2)}
                            </TableCell>
                        </TableRow>
                        ))}
                        {financialLogs.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-center text-white/50 py-8">No transactions found.</TableCell></TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab: Biddings */}
          <TabsContent value="biddings">
             <Card className="bg-[#0f1f3a] border-[#00ff88]/20 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Active Bidding Sessions</h2>
                    <Button onClick={loadData} size="sm" variant="outline" className="border-[#00ff88]/30 text-white">Refresh</Button>
                </div>
                {biddings.length === 0 ? <div className="text-center py-12 text-white/50"><Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />No active biddings.</div> : 
                    <div className="space-y-6">
                        {biddings.map(b => (
                            <Card key={b.bidding_id} className="bg-[#1a2f4a] border border-[#00ff88]/20 p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            Order #{b.order_id} <Badge variant="outline" className="ml-2 text-[#00ff88] border-[#00ff88]">${b.order_total}</Badge>
                                        </h3>
                                        <div className="text-sm text-white/60 mt-1"><Clock className="w-4 h-4 inline mr-1 text-orange-400"/> Time: {formatTime(b.remaining_seconds)}</div>
                                    </div>
                                    <Button onClick={() => handleOpenAssign(b)} className="bg-[#00ff88] text-[#0a1628]">Manual Assign</Button>
                                </div>
                                <div className="mt-2 bg-[#0a1628] p-2 rounded">
                                    <p className="text-xs text-white/50 mb-1">Bids: {b.bids.length}</p>
                                    {b.bids.map(bid => <div key={bid.bid_id} className="text-sm text-white flex justify-between"><span>{bid.employee_name}</span><span className="text-[#00ff88]">${bid.bid_amount}</span></div>)}
                                </div>
                            </Card>
                        ))}
                    </div>
                }
             </Card>
          </TabsContent>

          {/* Tab: Employees */}
          <TabsContent value="employees">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20 p-6">
                <div className="flex justify-between mb-4"><h2 className="text-xl font-semibold">Employee List</h2><Button onClick={openCreateEmployee} className="bg-[#00ff88] text-[#0a1628]">Hire New</Button></div>
                <Table>
                    <TableHeader>
                        <TableRow className="border-[#00ff88]/20">
                            <TableHead className="text-white h-12 align-middle w-1/5">Name</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/6">Role</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/6">Status</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/6">Reputation</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/6">Complaints</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/6">Demotions</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>{employees.map(e => (
                        <TableRow key={e.id} className="border-[#00ff88]/10 h-16">
                            <TableCell className="align-middle text-white w-1/5">
                                <div>
                                    <span className="font-medium">{e.name}</span>
                                    <div className="text-xs text-white/50">{e.email}</div>
                                </div>
                            </TableCell>
                            <TableCell className="align-middle text-white w-1/6">
                                <div className="flex items-center gap-2">
                                    {getRoleIcon(e.role)} {e.role}
                                </div>
                            </TableCell>
                            <TableCell className="align-middle w-1/6">
                                <div>{getStatusBadge(e.status)}</div>
                            </TableCell>
                            <TableCell className="align-middle text-white w-1/6">
                                <div>{e.reputation_score}/5.0</div>
                            </TableCell>
                            <TableCell className="align-middle text-white w-1/6">
                                <div className="text-center">
                                    <Badge className={e.complaint_count >= 3 ? 'bg-red-500 text-white' : e.complaint_count >= 2 ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'}>
                                        {e.complaint_count}/3
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell className="align-middle text-white w-1/6">
                                <div className="text-center">
                                    <Badge className={e.demotion_count >= 1 ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'}>
                                        {e.demotion_count}/2
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell className="align-middle w-1/6">
                                <div className="flex justify-end gap-2 items-center">
                                    <Button size="sm" variant="outline" onClick={() => openEditEmployee(e)}><Edit className="w-4 h-4"/></Button>
                                    {e.status === 'Active' ? 
                                        <Button size="sm" variant="outline" className="text-orange-400" onClick={() => handleEmployeeStatus(e.id, 'fire')}>Fire</Button> : 
                                        <Button size="sm" variant="outline" className="text-green-400" onClick={() => handleEmployeeStatus(e.id, 'activate')}>Activate</Button>
                                    }
                                    <Button size="sm" variant="outline" className="text-red-400" onClick={() => handleDeleteEmployee(e.id)}><Trash2 className="w-4 h-4"/></Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}</TableBody>
                </Table>
            </Card>
          </TabsContent>

          {/* Tab: Customers */}
          <TabsContent value="customers">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Customers</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-12 bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40 focus:border-[#00ff88] focus:ring-[#00ff88]/20"
                    />
                  </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="border-[#00ff88]/20">
                            <TableHead className="text-white h-12 align-middle w-1/4">Customer Info</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/6">Balance</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/4">Stats</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/6">Status</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>{filteredCustomers.map(c => (
                        <TableRow key={c.id} className="border-[#00ff88]/10 h-16">
                            <TableCell className="align-middle text-white">
                                <div>
                                    <div className="font-medium">{c.username}</div>
                                    <div className="text-xs text-white/50">{c.email}</div>
                                    <div className="text-xs text-white/50">{c.phone_number}</div>
                                </div>
                            </TableCell>
                            <TableCell className="align-middle text-[#00ff88] font-bold">
                                <div>${c.balance.toFixed(2)}</div>
                            </TableCell>
                            <TableCell className="align-middle text-white text-sm">
                                <div>
                                    <div>Orders: {c.order_count}</div>
                                    <div className={c.warning_count > 0 ? "text-red-400" : "text-white/50"}>Warnings: {c.warning_count}</div>
                                </div>
                            </TableCell>
                            <TableCell className="align-middle">
                                <div className="flex gap-2 items-center">
                                    {c.is_vip && <Badge className="bg-yellow-500 text-white"><Crown className="w-3 h-3 mr-1" />VIP</Badge>}
                                    {c.is_blacklisted ? <Badge className="bg-red-500 text-white">Blacklisted</Badge> : <Badge variant="outline" className="text-green-400 border-green-400">Active</Badge>}
                                </div>
                            </TableCell>
                            <TableCell className="align-middle">
                                <div className="flex justify-end gap-2 items-center">
                                  <Button size="sm" onClick={() => openEditCustomer(c)}>Modify</Button>

                                  {c.is_vip ? (
                                    <Button size="sm" variant="outline" className="text-yellow-400" onClick={() => handleToggleVIP(c.id, false)}>
                                      Remove VIP
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="outline" className="text-yellow-400" onClick={() => handleToggleVIP(c.id, true)}>
                                      Promote VIP
                                    </Button>
                                  )}

                                  <Button size="sm" variant="outline" className="text-orange-400" onClick={() => handleAddWarning(c.id)}>
                                    ⚠️ Warning
                                  </Button>

                                  <Button size="sm" variant="outline" className="text-red-400" onClick={() => handleDeleteCustomer(c.id)}>
                                    <Trash2 className="w-4 h-4"/>
                                  </Button>
                                </div>
                                
                            </TableCell>
                        </TableRow>
                    ))}</TableBody>
                </Table>
            </Card>
          </TabsContent>

          {/* 👇👇👇 Tab: AI Knowledge Base (新增内容) 👇👇👇 */}
          <TabsContent value="ai-brain">
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left: Add Form */}
                <div className="lg:col-span-1">
                    <Card className="bg-[#0f1f3a] border border-[#00ff88]/20 p-6 sticky top-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-[#00ff88]" /> Add Knowledge
                        </h2>
                        <p className="text-white/50 text-sm mb-6">
                            Teach the AI new facts to improve customer service.
                        </p>
                        <form onSubmit={handleAddKB} className="space-y-4">
                            <div>
                                <Label className="text-white mb-2 block">Question / Trigger</Label>
                                <Input 
                                    placeholder="e.g., Do you sell gift cards?" 
                                    value={newQuestion}
                                    onChange={e => setNewQuestion(e.target.value)}
                                    className="bg-[#1a2f4a] border-white/10 text-white"
                                />
                            </div>
                            <div>
                                <Label className="text-white mb-2 block">Standard Answer</Label>
                                <Textarea 
                                    placeholder="e.g., Yes, physical gift cards are available at the counter." 
                                    value={newAnswer}
                                    onChange={e => setNewAnswer(e.target.value)}
                                    className="bg-[#1a2f4a] border-white/10 text-white min-h-[120px]"
                                />
                            </div>
                            <Button 
                                type="submit" 
                                disabled={loadingKB}
                                className="w-full bg-[#00ff88] text-[#0a1628] hover:bg-[#00dd77] font-bold"
                            >
                                {loadingKB ? "Saving..." : "Add to Knowledge Base"}
                            </Button>
                        </form>
                    </Card>
                </div>

                {/* Right: Knowledge List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Brain className="w-5 h-5 text-[#00ff88]" /> Existing Knowledge
                        </h2>
                        <span className="text-white/40 text-sm">{kbEntries.length} entries found</span>
                    </div>

                    {kbEntries.map((entry) => (
                        <Card key={entry.id} className="bg-[#0f1f3a] border border-[#00ff88]/10 hover:border-[#00ff88]/30 transition-all p-5">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-4 h-4 text-[#00ff88]" />
                                        <h3 className="text-white font-semibold text-lg">{entry.question}</h3>
                                    </div>
                                    <p className="text-white/70 bg-[#1a2f4a] p-3 rounded-lg border border-white/5">
                                        {entry.answer}
                                    </p>
                                    
                                    <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                                        <span>Added by: <span className="text-white/60">{entry.author}</span></span>
                                        <span>•</span>
                                        <span>{entry.created_at}</span>
                                    </div>
                                </div>

                                {/* Rating Badge */}
                                <div className="flex flex-col items-end shrink-0 gap-2">
                                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${
                                        entry.avg_rating >= 4.0 ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                                        entry.avg_rating >= 3.0 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                                        'bg-red-500/10 border-red-500/30 text-red-400'
                                    }`}>
                                        <Star className="w-3 h-3 fill-current" />
                                        <span className="font-bold">{entry.avg_rating.toFixed(1)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white/30 text-xs">{entry.rating_count} ratings</span>
                                        <Button
                                            onClick={() => handleDeleteKB(entry.id)}
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {kbEntries.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
                            <Brain className="w-12 h-12 text-white/10 mx-auto mb-3" />
                            <p className="text-white/30">No knowledge entries yet.</p>
                        </div>
                    )}
                </div>
            </div>
            </TabsContent>
          {/* Tab: Reports */}
          <TabsContent value="reports">
            <div className="space-y-6">
              {/* Forum Reports */}
              <Card className="bg-[#0f1f3a] border-[#00ff88]/20 p-6">
                <div className="flex justify-between mb-4">
                  <h2 className="text-xl font-semibold">Forum Reports</h2>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="border-[#00ff88]/20">
                            <TableHead className="text-white h-12 align-middle w-1/7">Report Details</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/7">Content</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/7">Reporter</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/7">Accused</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/7">Status</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/7">Appeal Message</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/7 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>{forumReports && forumReports.length > 0 ? forumReports.map(r => (
                        <TableRow key={r.report_id} className="border-[#00ff88]/10 h-16">
                            <TableCell className="align-middle text-white">
                                <div>
                                    <div className="font-medium">Report #{r.report_id}</div>
                                    <div className="text-xs text-white/50">{new Date(r.created_at).toLocaleDateString()}</div>
                                    <div className="text-xs text-white/70 mt-1">{r.reason}</div>
                                </div>
                            </TableCell>
                            <TableCell className="align-middle text-white text-sm">
                                <div>
                                    <div className="font-medium">{r.content_type === 'post' ? 'Post' : 'Comment'}</div>
                                    <div className="text-xs text-white/50 truncate max-w-32">{r.content_info?.content?.substring(0, 50) || 'N/A'}...</div>
                                </div>
                            </TableCell>
                            <TableCell className="align-middle text-white">
                                <div className="text-sm">{r.reporter_name || 'Unknown'}</div>
                            </TableCell>
                            <TableCell className="align-middle text-white">
                                <div className="text-sm">{r.content_info?.author || 'Unknown'}</div>
                            </TableCell>
                            <TableCell className="align-middle">
                                <Badge className={r.status === 'pending' ? 'bg-yellow-500 text-white' : r.status === 'resolved' ? 'bg-green-500 text-white' : r.status === 'notified' ? 'bg-blue-500 text-white' : r.status === 'appealed' ? 'bg-purple-500 text-white' : r.status === 'repealed' ? 'bg-orange-500 text-white' : r.status === 'upheld' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'}>
                                    {r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : 'Unknown'}
                                </Badge>
                            </TableCell>
                            <TableCell className="align-middle text-white text-sm">
                                {r.appeal_message || '-'}
                            </TableCell>
                            <TableCell className="align-middle">
                                <div className="flex justify-end gap-2 items-center">
                                    {r.status === 'pending' && (
                                        <>
                                            <Button size="sm" onClick={() => handleUpdateReportStatus(r.report_id, 'notified')} className="bg-blue-500 hover:bg-blue-600 text-white">Notify Accused</Button>
                                            <Button size="sm" variant="outline" className="text-red-400" onClick={() => handleUpdateReportStatus(r.report_id, 'reviewed')}>Dismiss</Button>
                                        </>
                                    )}
                                    {r.status === 'appealed' && (
                                        <>
                                            <Button size="sm" onClick={() => handleReviewForumAppeal(r.report_id, 'repeal')} className="bg-green-500 hover:bg-green-600 text-white">Repeal</Button>
                                            <Button size="sm" variant="outline" className="text-red-400" onClick={() => handleReviewForumAppeal(r.report_id, 'uphold')}>Uphold</Button>
                                        </>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-white/50 py-8">
                                {forumReports ? 'No forum reports found' : 'Loading forum reports...'}
                            </TableCell>
                        </TableRow>
                    )}</TableBody>
                </Table>
              </Card>

              {/* Complaints */}
              <Card className="bg-[#0f1f3a] border-[#00ff88]/20 p-6">
                <div className="flex justify-between mb-4">
                  <h2 className="text-xl font-semibold">Complaints & Compliments</h2>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="border-[#00ff88]/20">
                            <TableHead className="text-white h-12 align-middle w-1/7">Complaint Details</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/7">Description</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/7">Filed By</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/7">Accused</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/7">Status</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/7">Appeal Message</TableHead>
                            <TableHead className="text-white h-12 align-middle w-1/7 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>{complaints && complaints.length > 0 ? complaints.filter(c => c.complaint_type === 'complaint').map(c => (
                        <TableRow key={c.complaint_id} className="border-[#00ff88]/10 h-16">
                            <TableCell className="align-middle text-white">
                                <div>
                                    <div className="font-medium">#{c.complaint_id} - {c.complaint_type}</div>
                                    <div className="text-xs text-white/50">{new Date(c.created_at).toLocaleDateString()}</div>
                                    <div className="text-xs text-white/70 mt-1">Category: {c.category}</div>
                                    {c.related_order_id && <div className="text-xs text-white/70">Order: #{c.related_order_id}</div>}
                                </div>
                            </TableCell>
                            <TableCell className="align-middle text-white text-sm">
                                <div className="truncate max-w-48">{c.description}</div>
                            </TableCell>
                            <TableCell className="align-middle text-white">
                                <div className="text-sm">{c.complainant_name}</div>
                                <div className="text-xs text-white/50">({c.complainant_type})</div>
                            </TableCell>
                            <TableCell className="align-middle text-white">
                                <div className="text-sm">{c.accused_name}</div>
                                <div className="text-xs text-white/50">({c.accused_type})</div>
                            </TableCell>
                            <TableCell className="align-middle">
                                <Badge className={c.status === 'pending' ? 'bg-yellow-500 text-white' : c.status === 'upheld' ? 'bg-green-500 text-white' : c.status === 'dismissed' ? 'bg-red-500 text-white' : c.status === 'disputed' ? 'bg-orange-500 text-white' : c.status === 'appealed' ? 'bg-purple-500 text-white' : 'bg-gray-500 text-white'}>
                                    {c.status.replace('_', ' ')}
                                </Badge>
                            </TableCell>
                            <TableCell className="align-middle text-white text-sm">
                                {c.appeal_message || '-'}
                            </TableCell>
                            <TableCell className="align-middle">
                                <div className="flex justify-end gap-2 items-center">
                                    {c.status === 'pending' && (
                                        <>
                                            <Button size="sm" onClick={() => handleNotifyAccused(c.complaint_id)} className="bg-blue-500 hover:bg-blue-600 text-white">Notify Accused</Button>
                                            <Button size="sm" variant="outline" className="text-red-400" onClick={() => handleReviewComplaint(c.complaint_id, 'dismissed')}>Dismiss</Button>
                                        </>
                                    )}
                                    {c.status === 'appealed' && (
                                        <>
                                            <Button size="sm" onClick={() => handleReviewAppeal(c.complaint_id, 'repeal')} className="bg-green-500 hover:bg-green-600 text-white">Repeal</Button>
                                            <Button size="sm" variant="outline" className="text-red-400" onClick={() => handleReviewAppeal(c.complaint_id, 'uphold')}>Uphold</Button>
                                        </>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-white/50 py-8">
                                {complaints ? 'No complaints found' : 'Loading complaints...'}
                            </TableCell>
                        </TableRow>
                    )}</TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Registration Requests */}
          <TabsContent value="registration">
            <Card className="bg-[#0f1f3a] border-[#00ff88]/20 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Pending Registration Requests</h2>
                <Button onClick={loadData} size="sm" variant="outline" className="border-[#00ff88]/30 text-white">Refresh</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#00ff88]/20">
                    <TableHead className="text-white">Request Details</TableHead>
                    <TableHead className="text-white">Contact Info</TableHead>
                    <TableHead className="text-white">Submitted</TableHead>
                    <TableHead className="text-white text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrationRequests && registrationRequests.length > 0 ? registrationRequests.map(request => (
                    <TableRow key={request.request_id} className="border-[#00ff88]/10">
                      <TableCell className="text-white">
                        <div>
                          <div className="font-medium">Request #{request.request_id}</div>
                          <div className="text-sm text-white/70">Username: {request.username}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        <div>
                          <div className="text-sm">{request.email}</div>
                          <div className="text-sm text-white/70">{request.phone_number}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white text-sm">
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleReviewRegistrationRequest(request.request_id, 'approve')}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleReviewRegistrationRequest(request.request_id, 'deny')}
                            className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                          >
                            Deny
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-white/50 py-8">
                        {registrationRequests ? 'No pending registration requests' : 'Loading requests...'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Modals remain the same... */}
        {showEmployeeModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                <Card className="bg-[#0f1f3a] border-[#00ff88]/20 max-w-md w-full p-6 relative">
                    <button onClick={() => setShowEmployeeModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5"/></button>
                    <h3 className="text-xl font-bold text-white mb-6">{isEditing ? 'Edit Employee' : 'Hire New Employee'}</h3>
                    <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                        <Input value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} placeholder="Name" className="bg-[#1a2a3a] text-white" required />
                        <Input value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} placeholder="Email" className="bg-[#1a2a3a] text-white" required />
                        {!isEditing && <Input type="password" value={empForm.password} onChange={e => setEmpForm({...empForm, password: e.target.value})} placeholder="Password" className="bg-[#1a2a3a] text-white" required />}
                        <Select value={empForm.role} onValueChange={(val) => setEmpForm({...empForm, role: val})}>
                            <SelectTrigger className="bg-[#1a2a3a] text-white"><SelectValue placeholder="Role" /></SelectTrigger>
                            <SelectContent className="bg-[#1a2a3a] text-white">
                                <SelectItem value="Chef">Chef</SelectItem><SelectItem value="Delivery">Delivery</SelectItem><SelectItem value="Manager">Manager</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button type="submit" className="w-full bg-[#00ff88] text-[#0a1628]">{isEditing ? 'Save' : 'Hire'}</Button>
                    </form>
                </Card>
            </div>
        )}

        {showCustomerModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                <Card className="bg-[#0f1f3a] border-[#00ff88]/20 max-w-md w-full p-6 relative">
                    <button onClick={() => setShowCustomerModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5"/></button>
                    <h3 className="text-xl font-bold text-white mb-6">Modify Customer</h3>
                    <form onSubmit={handleCustomerSubmit} className="space-y-4">
                        <Input value={custForm.username} onChange={e => setCustForm({...custForm, username: e.target.value})} placeholder="Username" className="bg-[#1a2a3a] text-white" required />
                        <Input value={custForm.email} onChange={e => setCustForm({...custForm, email: e.target.value})} placeholder="Email" className="bg-[#1a2a3a] text-white" required />
                        <Input value={custForm.phone_number} onChange={e => setCustForm({...custForm, phone_number: e.target.value})} placeholder="Phone" className="bg-[#1a2a3a] text-white" />
                        <div className="bg-[#00ff88]/10 p-4 rounded border border-[#00ff88]/30">
                            <Label className="text-[#00ff88]">Deposit Balance ($)</Label>
                            <Input type="number" step="0.01" value={custForm.deposited_cash} onChange={e => setCustForm({...custForm, deposited_cash: parseFloat(e.target.value)})} className="bg-[#0a1628] text-white font-bold mt-2" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" checked={custForm.is_blacklisted} onChange={e => setCustForm({...custForm, is_blacklisted: e.target.checked})} />
                            <Label className="text-red-400">Blacklist Customer</Label>
                        </div>
                        <Button type="submit" className="w-full bg-[#00ff88] text-[#0a1628]">Save Changes</Button>
                    </form>
                </Card>
            </div>
        )}

        {assignModalOpen && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                <Card className="bg-[#0f1f3a] border-[#00ff88]/20 max-w-md w-full p-6 relative">
                    <button onClick={() => setAssignModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5"/></button>
                    <h3 className="text-xl font-bold text-white mb-6">Assign Order</h3>
                    <form onSubmit={handleAssignSubmit} className="space-y-4">
                        <Select value={assignForm.employee_id} onValueChange={(val) => setAssignForm({...assignForm, employee_id: val})}>
                            <SelectTrigger className="bg-[#1a2a3a] text-white"><SelectValue placeholder="Select Delivery Person" /></SelectTrigger>
                            <SelectContent className="bg-[#1a2a3a] text-white">
                                {deliveryStaff.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name} (Rep: {e.reputation_score})</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input value={assignForm.memo} onChange={e => setAssignForm({...assignForm, memo: e.target.value})} placeholder="Memo (required)" className="bg-[#1a2a3a] text-white" required />
                        <Button type="submit" className="w-full bg-[#00ff88] text-[#0a1628]">Confirm</Button>
                    </form>
                </Card>
            </div>
        )}

      </div>
    </div>
  );
}