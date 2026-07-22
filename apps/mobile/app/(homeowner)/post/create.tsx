import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { lookupService, type Category } from '@/services/lookup.service';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';

export default function CreateJobScreen() {
  const { t } = useTranslation();
  const toast = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    lookupService
      .categories()
      .then(({ data }) => setCategories(data))
      .catch(() => toast.show({ message: t('common.error'), variant: 'error' }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCategorySelect(cat: Category) {
    setSelected(cat.id);
    setTimeout(() => {
      router.push({
        pathname: '/(homeowner)/post/details' as any,
        params: { categoryId: cat.id, categoryName: cat.nameEn ?? cat.name },
      });
    }, 150);
  }

  const rows: Category[][] = [];
  for (let i = 0; i < categories.length; i += 2) {
    rows.push(categories.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ProgressBar currentStep={1} totalSteps={3} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name={Icons.back as any} size={24} color={Colors.gray600} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('homeowner.post.newJobTitle')}</Text>
        <Text style={styles.stepLabel}>
          {t('homeowner.post.stepLabel', { current: 1, total: 3 })}
        </Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.pageTitle}>{t('homeowner.post.step1Title')}</Text>
        <Text style={styles.pageSubtitle}>{t('homeowner.post.step1Subtitle')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((cat) => {
                const isSelected = selected === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.tile, isSelected && styles.tileSelected]}
                    onPress={() => handleCategorySelect(cat)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
                      <MaterialIcons
                        name={cat.icon as any}
                        size={24}
                        color={isSelected ? Colors.primary600 : Colors.gray400}
                      />
                    </View>
                    <Text style={[styles.tileName, isSelected && styles.tileNameSelected]}>
                      {cat.nameEn ?? cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {row.length === 1 && <View style={styles.tilePlaceholder} />}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.hintRow}>
        <Text style={styles.hintText}>{t('homeowner.post.tapHint')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s3,
    paddingBottom: Spacing.s2,
    gap: Spacing.s3,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.heading2.fontSize,
    fontWeight: Typography.heading2.fontWeight as any,
    color: Colors.gray900,
  },
  stepLabel: {
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight as any,
    color: Colors.gray400,
  },

  titleBlock: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s2,
    paddingBottom: Spacing.s4,
  },
  pageTitle: {
    fontSize: Typography.heading1.fontSize,
    fontWeight: Typography.heading1.fontWeight as any,
    color: Colors.primary600,
    marginBottom: Spacing.s1,
  },
  pageSubtitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    color: Colors.gray600,
  },

  grid: {
    paddingHorizontal: Spacing.s4,
    paddingBottom: Spacing.s4,
    gap: Spacing.s3,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.s3,
  },
  tile: {
    flex: 1,
    backgroundColor: Colors.bgApp,
    borderWidth: 1.5,
    borderColor: Colors.sand,
    borderRadius: Radius.md,
    padding: Spacing.s4,
    gap: Spacing.s3,
    alignItems: 'flex-start',
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: Colors.primary600,
    backgroundColor: Colors.primary50,
  },
  tilePlaceholder: {
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSelected: {
    backgroundColor: Colors.primary100,
  },
  tileName: {
    fontSize: Typography.label.fontSize,
    fontWeight: '600' as any,
    color: Colors.gray900,
  },
  tileNameSelected: {
    color: Colors.primary600,
  },

  hintRow: {
    alignItems: 'center',
    paddingVertical: Spacing.s4,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  hintText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.caption.fontWeight as any,
    color: Colors.gray400,
  },
});
