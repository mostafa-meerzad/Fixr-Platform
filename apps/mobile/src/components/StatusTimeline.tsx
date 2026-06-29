import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import type { JobStatus } from '@/services/jobs.service';

function getStepIndex(status: JobStatus): number {
  switch (status) {
    case 'ASSIGNED':             return 0;
    case 'EN_ROUTE':             return 1;
    case 'ARRIVED':              return 2;
    case 'IN_PROGRESS':          return 3;
    case 'COMPLETION_REQUESTED': return 4;
    case 'COMPLETED':            return 5; // all nodes filled
    default:                     return 0;
  }
}

interface StatusTimelineProps {
  status: JobStatus;
}

export function StatusTimeline({ status }: StatusTimelineProps) {
  const { t } = useTranslation();
  const currentIndex = getStepIndex(status);

  const steps = [
    t('common.timeline.accepted'),
    t('common.timeline.enRoute'),
    t('common.timeline.arrived'),
    t('common.timeline.inProgress'),
    t('common.timeline.done'),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.circlesRow}>
        {steps.map((_, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <React.Fragment key={i}>
              <View
                style={[
                  styles.circle,
                  isDone ? styles.circleDone : isCurrent ? styles.circleCurrent : styles.circleFuture,
                ]}
              />
              {i < steps.length - 1 && (
                <View style={[styles.line, i < currentIndex && styles.lineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
      <View style={styles.labelsRow}>
        {steps.map((label, i) => (
          <View key={i} style={styles.labelCol}>
            <Text style={styles.stepLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.s2,
  },
  circlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  circleDone: {
    backgroundColor: Colors.primary600,
  },
  circleCurrent: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary600,
  },
  circleFuture: {
    backgroundColor: Colors.gray200,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.gray200,
  },
  lineDone: {
    backgroundColor: Colors.primary600,
  },
  labelsRow: {
    flexDirection: 'row',
  },
  labelCol: {
    flex: 1,
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.gray400,
    textAlign: 'center',
  },
});
