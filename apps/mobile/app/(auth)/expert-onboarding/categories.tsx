import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { lookupService, type Category } from '@/services/lookup.service';
import { usersService } from '@/services/users.service';
import { Colors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [selectionError, setSelectionError] = useState('');

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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    if (selectionError) setSelectionError('');
  }

  async function handleNext() {
    if (selected.size === 0) {
      setSelectionError(t('auth.onboarding.categoriesError'));
      return;
    }
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
    <ScreenWrapper>
      <ProgressBar currentStep={3} totalSteps={4} />

      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.stepLabel}>
            {t('auth.onboarding.stepLabel', { current: 3, total: 4 })}
          </Text>
        </View>

        <Text style={styles.title}>{t('auth.onboarding.categoriesTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.onboarding.categoriesSubtitle')}</Text>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={Colors.primary600} />
          </View>
        ) : (
          <>
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
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleCategory(item.id)}
                    activeOpacity={0.75}
                  >
                    {item.icon ? (
                      <MaterialIcons
                        name={item.icon as any}
                        size={IconSize.inline}
                        color={isSelected ? Colors.white : Colors.primary600}
                      />
                    ) : null}
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                      {item.nameEn ?? item.name}
                    </Text>
                    {isSelected && (
                      <MaterialIcons
                        name={Icons.check as any}
                        size={IconSize.status}
                        color={Colors.white}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
            {selectionError ? (
              <Text style={styles.errorText}>{selectionError}</Text>
            ) : null}
          </>
        )}

        <View style={styles.footer}>
          <Button
            label={saving ? t('auth.onboarding.categoriesSaving') : t('common.next')}
            onPress={handleNext}
            disabled={loading || saving}
            loading={saving}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.s4,
    paddingBottom: Spacing.s6,
  },
  headerRow: {
    marginTop: Spacing.s4,
    marginBottom: Spacing.s4,
  },
  stepLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight as any,
    color: Colors.gray400,
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
  },
  grid: {
    gap: Spacing.s3,
  },
  row: {
    gap: Spacing.s3,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s2,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s3,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary600,
    backgroundColor: Colors.white,
    minHeight: 52,
  },
  chipSelected: {
    backgroundColor: Colors.primary600,
    borderColor: Colors.primary600,
  },
  chipLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: '600',
    color: Colors.primary600,
    textAlign: 'center',
    flexShrink: 1,
  },
  chipLabelSelected: {
    color: Colors.white,
  },
  errorText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.danger600,
    marginTop: Spacing.s2,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: Spacing.s4,
  },
});
