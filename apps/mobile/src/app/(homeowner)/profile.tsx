import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { Colors, Spacing } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';

export default function HomeownerProfileScreen() {
  const { t } = useTranslation();
  const { textAlign } = useRTL();
  const { user, clearAuth } = useAuthStore();

  async function handleLogout() {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('no'), style: 'cancel' },
      {
        text: t('yes'), style: 'destructive', onPress: async () => {
          try {
            const SecureStore = await import('expo-secure-store');
            const rt = await SecureStore.getItemAsync('fixr_refresh_token');
            if (rt) await authService.logout(rt);
          } catch {}
          await clearAuth();
          router.replace('/(auth)/phone');
        },
      },
    ]);
  }

  return (
    <ScreenWrapper scroll>
      <View style={styles.avatarArea}>
        <View style={styles.avatar}>
          <Text variant="h2" color={Colors.primary}>
            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text variant="h3" style={{ textAlign }}>{user?.name}</Text>
        <Text variant="sm" muted style={{ textAlign }}>{user?.phone}</Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Text variant="label">{t('profile')}</Text>
          <Text variant="sm" muted>{t('homeowner')}</Text>
        </View>
      </Card>

      <Button
        label={t('logout')}
        variant="danger"
        onPress={handleLogout}
        fullWidth
        style={styles.logoutBtn}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  avatarArea: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  card: { marginBottom: Spacing.md, gap: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoutBtn: { marginTop: Spacing.xl, marginBottom: Spacing.xxxl },
});
