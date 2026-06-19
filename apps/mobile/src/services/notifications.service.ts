import { api } from './api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export const notificationsService = {
  list: (page = 1, limit = 30) =>
    api.get('/notifications/me', { params: { page, limit } }),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllRead: () =>
    api.patch('/notifications/me/read-all'),

  async registerPushToken(): Promise<string | null> {
    if (!Device.isDevice) return null;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    return token;
  },
};
