
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Check, CheckCheck, Calendar, User, AlertTriangle, Edit } from 'lucide-react';
import { useGMNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/hooks/useGMNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const GMNotifications = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>('all');
  
  const { data: notifications = [], isLoading } = useGMNotifications(profile?.gm_id);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'modified':
        return <Edit className="w-4 h-4 text-orange-600" />;
      case 'cancelled':
      case 'unassigned':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'assignment':
        return 'border-l-blue-500 bg-blue-50';
      case 'modified':
        return 'border-l-orange-500 bg-orange-50';
      case 'cancelled':
      case 'unassigned':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'assignment':
        return 'Assignation';
      case 'modified':
        return 'Modification';
      case 'cancelled':
        return 'Annulation';
      case 'unassigned':
        return 'Désassignation';
      default:
        return type;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.is_read;
    return notification.notification_type === filter;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (notificationId: string) => {
    markAsRead.mutate(notificationId, {
      onSuccess: () => {
        toast({
          title: "Notification marquée comme lue",
          description: "La notification a été marquée comme lue",
        });
      }
    });
  };

  const handleMarkAllAsRead = async () => {
    if (!profile?.gm_id) return;
    
    markAllAsRead.mutate(profile.gm_id, {
      onSuccess: () => {
        toast({
          title: "Toutes les notifications marquées comme lues",
          description: "Toutes vos notifications ont été marquées comme lues",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement des notifications...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="unread">Non lues</SelectItem>
                <SelectItem value="assignment">Assignations</SelectItem>
                <SelectItem value="modified">Modifications</SelectItem>
                <SelectItem value="cancelled">Annulations</SelectItem>
                <SelectItem value="unassigned">Désassignations</SelectItem>
              </SelectContent>
            </Select>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                Tout marquer lu
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>
              {filter === 'unread' ? 'Aucune notification non lue' : 
               filter === 'all' ? 'Aucune notification' : 
               `Aucune notification de type "${getTypeLabel(filter)}"`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-l-4 rounded-r-lg ${getNotificationColor(notification.notification_type)} ${
                  !notification.is_read ? 'border-2 border-blue-200' : 'border border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getNotificationIcon(notification.notification_type)}
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(notification.notification_type)}
                      </Badge>
                      {!notification.is_read && (
                        <Badge variant="destructive" className="text-xs">
                          Nouveau
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500 ml-auto">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {new Date(notification.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    {notification.event_data && (
                      <div className="text-xs bg-white bg-opacity-50 p-2 rounded">
                        <strong>Détails:</strong> {notification.event_data.date} à {notification.event_data.start_time}
                        {notification.event_data.location && ` - ${notification.event_data.location}`}
                      </div>
                    )}
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GMNotifications;
