import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FixrLogo } from '../../components/ui/FixrLogo';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { useRTL } from '../../hooks/useRTL';

type Role = 'HOMEOWNER' | 'EXPERT';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { phone, sessionId } = useLocalSearchParams<{ phone: string; sessionId: string }>();
  const { setAuth } = useAuthStore();

  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('HOMEOWNER');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim()) {
      setNameError(t('nameRequired'));
      return;
    }
    setNameError('');
    setLoading(true);
    try {
      const res = await authService.register({ phone, name: name.trim(), role, sessionId });
      const { accessToken, refreshToken, user } = res.data.data;
      await setAuth(user, accessToken, refreshToken);
      router.replace(role === 'EXPERT' ? '/(expert)/home' : '/(homeowner)/home');
    } catch (e: any) {
      setNameError(e?.response?.data?.message ?? t('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper scroll>
      <View style={styles.container}>
        <View style={styles.logoArea}>
          <FixrLogo size="sm" />
        </View>

        <Text variant="h2" style={{ textAlign }}>{t('completeProfile')}</Text>
        <Text variant="sm" muted style={[styles.subtitle, { textAlign }]}>
          {t('registerSubtitle')}
        </Text>

        <Input
          label={t('yourName')}
          placeholder={t('namePlaceholder')}
          value={name}
          onChangeText={(v) => { setName(v); setNameError(''); }}
          error={nameError}
          autoFocus
        />

        <View style={styles.roleSection}>
          <Text variant="label" style={{ textAlign }}>{t('iAmA')}</Text>
          <View style={styles.roleRow}>
            <RoleCard
              title={t('homeowner')}
              desc={t('homeownerDesc')}
              selected={role === 'HOMEOWNER'}
              onPress={() => setRole('HOMEOWNER')}
            />
            <RoleCard
              title={t('expert')}
              desc={t('expertDesc')}
              selected={role === 'EXPERT'}
              onPress={() => setRole('EXPERT')}
            />
          </View>
        </View>

        <Button
          label={t('getStarted')}
          onPress={handleRegister}
          loading={loading}
          fullWidth
          style={styles.btn}
        />
      </View>
    </ScreenWrapper>
  );
}

function RoleCard({ title, desc, selected, onPress }: {
  title: string; desc: string; selected: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.roleCard, selected && styles.roleCardSelected]}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text variant="body" bold={selected} color={selected ? Colors.textPrimary : Colors.textSecondary}>
        {title}
      </Text>
      <Text variant="xs" color={Colors.textSecondary} style={styles.roleDesc}>{desc}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  logoArea: { alignItems: 'center', paddingVertical: Spacing.xl },
  subtitle: { marginTop: -Spacing.sm },
  roleSection: { gap: Spacing.md },
  roleRow: { flexDirection: 'column', gap: Spacing.sm },
  roleCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
    gap: Spacing.xs,
  },
  roleCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  radioOuter: {
    width: 20, height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  roleDesc: { marginTop: 2 },
  btn: { marginTop: Spacing.md },
});
