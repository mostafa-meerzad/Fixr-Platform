import { Platform } from 'react-native';
import { api } from './api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { usersService } from './users.service';

export const notificationsService = {
  list: (page = 1, limit = 30) =>
    api.get('/notifications/me', { params: { page, limit } }),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllRead: () =>
    api.patch('/notifications/me/read-all'),

  async registerPushToken(): Promise<string | null> {
    if (!Device.isDevice) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('fixr_default', {
        name: 'Fixr',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0D9488',
        sound: 'default',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    try {
      const { data: token } = await Notifications.getDevicePushTokenAsync();
      await usersService.updateFcmToken(token);
      return token;
    } catch {
      return null;
    }
  },
};
