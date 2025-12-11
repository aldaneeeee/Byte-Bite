import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    loadNotifications();
  }, []);

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

  // Only show if user is logged in (has token in localStorage)
  const token = localStorage.getItem('token');
  if (!token) return null;

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
        <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto bg-[#1a2332] border-gray-700 z-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-gray-400 text-center py-4">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-gray-400 text-center py-4">No notifications</div>
            ) : (
              notifications.map((notification) => (
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
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}