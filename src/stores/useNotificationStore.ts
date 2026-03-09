import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  unreadCount: () => number;
}

const genId = () => Math.random().toString(36).slice(2, 10);

const initialNotifications: AppNotification[] = [];
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: initialNotifications,

  addNotification: (n) => set((s) => ({
    notifications: [
      { ...n, id: genId(), read: false, createdAt: new Date().toISOString() },
      ...s.notifications,
    ],
  })),

  markRead: (id) => set((s) => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
  })),

  markAllRead: () => set((s) => ({
    notifications: s.notifications.map(n => ({ ...n, read: true })),
  })),

  removeNotification: (id) => set((s) => ({
    notifications: s.notifications.filter(n => n.id !== id),
  })),

  clearAll: () => set({ notifications: [] }),

  unreadCount: () => get().notifications.filter(n => !n.read).length,
}));
