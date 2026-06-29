import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { Avatar } from '@/components/ui/Avatar';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill, getStatusVariant } from '@/components/ui/Pill';
import { jobsService, type Job, type JobListResponse } from '@/services/jobs.service';

const CHAT_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETION_REQUESTED', 'COMPLETED'];

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ASSIGNED: 'Assigned',
    EN_ROUTE: 'En Route',
    ARRIVED: 'Arrived',
    IN_PROGRESS: 'In Progress',
    COMPLETION_REQUESTED: 'Completion Req.',
    COMPLETED: 'Completed',
  };
  return map[status] ?? status;
}

export default function MessagesScreen() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await jobsService.list({ limit: 50, page: 1 });
      const body = res.data as JobListResponse;
      const chatJobs = body.data.filter((j) => CHAT_STATUSES.includes(j.status));
      setJobs(chatJobs);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item: job, index }: { item: Job; index: number }) => (
    <View>
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/(shared)/chat/${job.id}` as any)}
        activeOpacity={0.7}
      >
        <Avatar size={40} name={job.title} />
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {job.title}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {job.zone?.nameEn}
          </Text>
        </View>
        <Pill label={getStatusLabel(job.status)} variant={getStatusVariant(job.status)} />
      </TouchableOpacity>
      {index < jobs.length - 1 ? <Divider style={styles.divider} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>{t('homeowner.messages.subtitle')}</Text>
        <Text style={styles.title}>{t('homeowner.messages.title')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary600} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              icon={Icons.chatNone}
              title={t('homeowner.messages.emptyTitle')}
              subtitle={t('homeowner.messages.emptySubtitle')}
            />
          }
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgApp,
  },
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s3,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.gray400,
    marginBottom: 2,
  },
  title: {
    ...Typography.display,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...Typography.body,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s3,
    backgroundColor: Colors.white,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...Typography.bodyMd,
  },
  rowMeta: {
    ...Typography.caption,
  },
  divider: {
    marginVertical: 0,
  },
});
