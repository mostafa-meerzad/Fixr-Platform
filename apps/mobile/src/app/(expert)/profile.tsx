import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Divider } from '../../components/ui/Divider';
import { StarRating } from '../../components/ui/StarRating';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';

const VERIFICATION_COLOR: Record<string, string> = {
  UNVERIFIED: Colors.danger,
  PENDING: Colors.warning,
  VERIFIED: Colors.primary,
  REJECTED: Colors.danger,
};

export default function ExpertProfileScreen() {
  const { t, i18n } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { user, accessToken, clearAuth } = useAuthStore();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const base = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
      const res = await fetch(`${base}/experts/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      setProfile(json?.data ?? null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() { setRefreshing(true); load(); }

  async function handleLogout() {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('no'), style: 'cancel' },
      {
        text: t('yes'), style: 'destructive', onPress: async () => {
          try {
            const { SecureStore } = await import('expo-secure-store');
            const rt = await SecureStore.getItemAsync('fixr_refresh_token');
            if (rt) await authService.logout(rt);
          } catch {}
          await clearAuth();
          router.replace('/(auth)/phone');
        },
      },
    ]);
  }

  const verificationStatus: string = profile?.verificationStatus ?? 'UNVERIFIED';

  return (
    <ScreenWrapper scroll refreshing={refreshing} onRefresh={onRefresh}>
      {/* Avatar + name */}
      <View style={styles.avatarArea}>
        <View style={styles.avatar}>
          <Text variant="h2" color={Colors.primary}>
            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text variant="h3" style={{ textAlign }}>{user?.name}</Text>
        <Text variant="sm" muted style={{ textAlign }}>{user?.phone}</Text>
      </View>

      {/* Verification status */}
      <Card style={styles.card}>
        <View style={[styles.row, { flexDirection }]}>
          <Text variant="label">{t('bidStatus')}</Text>
          <Text variant="sm" bold color={VERIFICATION_COLOR[verificationStatus] ?? Colors.textSecondary}>
            {verificationStatus === 'VERIFIED' ? t('verifiedExpert') :
             verificationStatus === 'PENDING' ? t('pendingVerification') :
             t('unverified')}
          </Text>
        </View>
        {verificationStatus !== 'VERIFIED' && (
          <Button
            label={t('submitDocuments')}
            variant="outline"
            size="sm"
            onPress={() => {}}
            fullWidth
            style={{ marginTop: Spacing.sm }}
          />
        )}
      </Card>

      {/* Stats */}
      {profile && (
        <Card style={styles.card}>
          <View style={styles.statsGrid}>
            <StatItem label={t('jobsCompleted')} value={profile.completedJobs ?? 0} />
            <StatItem label={t('noShowCount')} value={profile.noShowCount ?? 0} />
            <StatItem
              label={t('completionRate')}
              value={profile.completionRate ? `${Math.round(profile.completionRate * 100)}%` : '—'}
            />
          </View>
          {profile.avgRating != null && (
            <>
              <Divider />
              <View style={[styles.row, { flexDirection }]}>
                <Text variant="label">{t('rating')}</Text>
                <StarRating value={profile.avgRating} size={16} />
              </View>
            </>
          )}
        </Card>
      )}

      {/* Zones */}
      {profile?.zones?.length > 0 && (
        <Card style={styles.card}>
          <Text variant="label">{t('myZones')}</Text>
          <View style={styles.tags}>
            {profile.zones.map((z: any) => (
              <View key={z.zone?.id ?? z.id} style={styles.tag}>
                <Text variant="xs">{i18n.language === 'fa' ? z.zone?.name ?? z.name : z.zone?.nameEn ?? z.name}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Categories */}
      {profile?.categories?.length > 0 && (
        <Card style={styles.card}>
          <Text variant="label">{t('myCategories')}</Text>
          <View style={styles.tags}>
            {profile.categories.map((c: any) => (
              <View key={c.category?.id ?? c.id} style={styles.tag}>
                <Text variant="xs">{i18n.language === 'fa' ? c.category?.name ?? c.name : c.category?.nameEn ?? c.name}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

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

function StatItem({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.statItem}>
      <Text variant="h3">{String(value)}</Text>
      <Text variant="xs" muted>{label}</Text>
    </View>
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
  row: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  logoutBtn: { marginTop: Spacing.xl, marginBottom: Spacing.xxxl },
});
