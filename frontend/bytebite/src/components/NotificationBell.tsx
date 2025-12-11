import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { api } from '../utils/api';

interface Notification {
  notification_id: number;
  title: string;
  message: string;
  type: string;
  related_id: number;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealForm, setAppealForm] = useState({
    id: 0,
    type: '', // 'complaint' or 'forum_report'
    appealMessage: ''
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    loadNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Also refresh when opening the notification panel
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.getUserNotifications();
      if (response.success) {
        setNotifications(response.notifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await api.markNotificationRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === notificationId
            ? { ...n, is_read: true }
            : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const dismissNotification = (notificationId: number) => {
    setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
  };

  const handleAppeal = async () => {
    if (!appealForm.appealMessage.trim()) {
      alert('Please provide an appeal message');
      return;
    }

    try {
      let response;
      if (appealForm.type === 'complaint') {
        response = await api.appealComplaint(appealForm.id, {
          appeal_message: appealForm.appealMessage
        });
      } else if (appealForm.type === 'forum_report') {
        response = await api.appealForumReport(appealForm.id, {
          appeal_message: appealForm.appealMessage
        });
      } else {
        alert('Invalid appeal type');
        return;
      }

      if (response.success) {
        alert('Appeal submitted successfully! A manager will review it.');
        setShowAppealModal(false);
        setAppealForm({ id: 0, type: '', appealMessage: '' });
        // Remove the notification from the list after successful appeal
        setNotifications(prev => prev.filter(n => !(n.related_id === appealForm.id && n.type === appealForm.type)));
      } else {
        alert(response.message || 'Failed to submit appeal');
      }
    } catch (error) {
      console.error('Failed to submit appeal:', error);
      alert('Failed to submit appeal');
    }
  };

  const openAppealModal = (id: number, type: string) => {
    setAppealForm({ id, type, appealMessage: '' });
    setShowAppealModal(true);
    setIsOpen(false); // Close notification panel when opening appeal modal
  };

  // Only show if user is logged in (has token in localStorage)
  const customerToken = localStorage.getItem('authToken');
  const employeeToken = localStorage.getItem('employeeToken');
  if (!customerToken && !employeeToken) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-white hover:bg-white/10"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto bg-[#0f1f3a] border-[#00ff88]/20 z-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-gray-400 text-center py-4">Loading...</div>
            ) : notifications.filter(n => !n.is_read).length === 0 ? (
              <div className="text-gray-400 text-center py-4">No notifications</div>
            ) : (
              notifications.filter(n => !n.is_read).map((notification) => (
                <div
                  key={notification.notification_id}
                  className={`p-3 rounded-lg border ${
                    notification.is_read
                      ? 'bg-gray-800/50 border-gray-600'
                      : 'bg-blue-900/20 border-blue-500/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-medium text-sm">{notification.title}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissNotification(notification.notification_id)}
                      className="text-gray-400 hover:text-white h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{notification.message}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      {(notification.type === 'complaint' || notification.type === 'forum_report') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAppealModal(notification.related_id, notification.type)}
                          className="text-orange-400 hover:text-orange-300 text-xs h-6 px-2"
                        >
                          Appeal
                        </Button>
                      )}
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.notification_id)}
                          className="text-blue-400 hover:text-blue-300 text-xs h-6 px-2"
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Appeal Modal */}
      {showAppealModal && (
        <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto bg-[#1a2332] border-gray-700 z-60">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">
              Appeal {appealForm.type === 'complaint' ? 'Complaint' : 'Forum Report'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Appeal Message
              </label>
              <Textarea
                value={appealForm.appealMessage}
                onChange={(e) => setAppealForm({...appealForm, appealMessage: e.target.value})}
                placeholder="Explain why you believe this complaint is unjust..."
                rows={4}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleAppeal()}
                className="flex-1"
              >
                Submit Appeal
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAppealModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}