import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { lookupService, type Category } from '@/services/lookup.service';
import { usersService } from '@/services/users.service';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await lookupService.categories();
      setCategories(res.data);
    } catch {
      toast.show({ message: t('auth.onboarding.categoriesLoadError'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleNext() {
    setSaving(true);
    try {
      await usersService.updateCategories(Array.from(selected));
      router.push('/(auth)/expert-onboarding/business' as any);
    } catch {
      toast.show({ message: t('auth.onboarding.errorNetwork'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenWrapper scroll>
      <StepIndicator total={4} current={3} />

      <View style={styles.container}>
        <Text style={styles.title}>{t('auth.onboarding.categoriesTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.onboarding.categoriesSubtitle')}</Text>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={Colors.primary600} />
          </View>
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => {
              const isSelected = selected.has(item.id);
              return (
                <TouchableOpacity
                  style={[styles.tile, isSelected && styles.tileSelected]}
                  onPress={() => toggleCategory(item.id)}
                  activeOpacity={0.75}
                >
                  {item.icon ? (
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={IconSize.btn}
                      color={isSelected ? Colors.white : Colors.gray600}
                    />
                  ) : null}
                  <Text style={[styles.tileLabel, isSelected && styles.tileLabelSelected]}>
                    {item.nameEn ?? item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Selection counter */}
        <Text style={[styles.counter, selected.size === 0 && styles.counterZero]}>
          {selected.size === 0
            ? t('auth.onboarding.categoriesNoneSelected')
            : t('auth.onboarding.categoriesSelected', { count: selected.size })}
        </Text>

        <View style={styles.footer}>
          <Button
            label={saving ? t('auth.onboarding.categoriesSaving') : t('common.next')}
            onPress={handleNext}
            disabled={loading || saving || selected.size === 0}
            loading={saving}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ total, current }: { total: number; current: number }) {
  return (
    <View style={indicatorStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            indicatorStyles.segment,
            i < current
              ? indicatorStyles.segmentFilled
              : indicatorStyles.segmentEmpty,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const indicatorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.s2,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s2,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: Radius.full,
  },
  segmentFilled: {
    backgroundColor: Colors.primary600,
  },
  segmentEmpty: {
    backgroundColor: Colors.sand,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s6,
  },
  title: {
    fontSize: Typography.heading1.fontSize,
    fontWeight: Typography.heading1.fontWeight as any,
    color: Colors.primary600,
    marginBottom: Spacing.s2,
  },
  subtitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray600,
    marginBottom: Spacing.s5,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.s10,
  },
  grid: {
    gap: Spacing.s3,
  },
  row: {
    gap: Spacing.s3,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s2,
    paddingVertical: Spacing.s4,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    minHeight: 80,
  },
  tileSelected: {
    backgroundColor: Colors.primary600,
    borderColor: Colors.primary600,
  },
  tileLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: '600',
    color: Colors.gray600,
    textAlign: 'center',
  },
  tileLabelSelected: {
    color: Colors.white,
  },
  counter: {
    fontSize: Typography.label.fontSize,
    fontWeight: '500',
    color: Colors.primary600,
    textAlign: 'center',
    marginTop: Spacing.s4,
    marginBottom: Spacing.s2,
  },
  counterZero: {
    color: Colors.gray400,
  },
  footer: {
    marginTop: Spacing.s4,
  },
});
