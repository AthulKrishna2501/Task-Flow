export interface Notification {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    read: boolean;
    type: 'task' | 'request' | 'system';
}

export interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
}
