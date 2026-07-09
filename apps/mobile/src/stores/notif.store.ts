import { create } from 'zustand';

interface NotifState {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  increment: () => void;
  unreadChatCount: number;
  setUnreadChatCount: (n: number) => void;
  incrementUnreadChat: () => void;
  clearUnreadChat: () => void;
}

export const useNotifStore = create<NotifState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),
  increment: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  unreadChatCount: 0,
  setUnreadChatCount: (n) => set({ unreadChatCount: n }),
  incrementUnreadChat: () => set((s) => ({ unreadChatCount: s.unreadChatCount + 1 })),
  clearUnreadChat: () => set({ unreadChatCount: 0 }),
}));
