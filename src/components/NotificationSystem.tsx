// components/NotificationSystem.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { NotificationMessage, MessageType, UseNotificationsReturn } from '@/types/profiles';

// Hook pour gérer les notifications
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: NotificationMessage = {
      id,
      duration: 5000, // 5 secondes par défaut
      ...notification,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-suppression après la durée spécifiée
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };
}

// Composant de notification individuelle
interface NotificationItemProps {
  notification: NotificationMessage;
  onRemove: (id: string) => void;
}

function NotificationItem({ notification, onRemove }: NotificationItemProps) {
  const getIcon = (type: MessageType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getColors = (type: MessageType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className={`max-w-sm w-full rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out ${getColors(notification.type)}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon(notification.type)}
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium">
            {notification.title}
          </p>
          <p className="text-sm mt-1 opacity-90">
            {notification.message}
          </p>
          {notification.action && (
            <div className="mt-3">
              <button
                onClick={notification.action.onClick}
                className="text-sm font-medium underline hover:no-underline"
              >
                {notification.action.label}
              </button>
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => onRemove(notification.id)}
            className="rounded-md inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <span className="sr-only">Fermer</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant principal du système de notifications
interface NotificationSystemProps {
  notifications: NotificationMessage[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function NotificationSystem({ 
  notifications, 
  onRemove, 
  position = 'top-right' 
}: NotificationSystemProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className={`fixed z-50 ${getPositionClasses()}`}>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}

// Hook combiné pour une utilisation simplifiée
export function useProfileNotifications() {
  const { notifications, addNotification, removeNotification, clearNotifications } = useNotifications();

  const showSuccess = useCallback((message: string, title = 'Succès') => {
    addNotification({
      type: 'success',
      title,
      message,
      duration: 4000,
    });
  }, [addNotification]);

  const showError = useCallback((message: string, title = 'Erreur') => {
    addNotification({
      type: 'error',
      title,
      message,
      duration: 6000,
    });
  }, [addNotification]);

  const showWarning = useCallback((message: string, title = 'Attention') => {
    addNotification({
      type: 'warning',
      title,
      message,
      duration: 5000,
    });
  }, [addNotification]);

  const showInfo = useCallback((message: string, title = 'Information') => {
    addNotification({
      type: 'info',
      title,
      message,
      duration: 4000,
    });
  }, [addNotification]);

  return {
    notifications,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

export default NotificationSystem;