import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

type AvatarSize = 32 | 36 | 40 | 56 | 80;

interface AvatarProps {
  size?: AvatarSize;
  name?: string | null;
  uri?: string | null;
  verified?: boolean;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

export function Avatar({ size = 40, name, uri, verified = false }: AvatarProps) {
  const badgeSize = 20;
  const fontSize = Math.round(size * 0.36);

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
        </View>
      )}
      {verified && (
        <View
          style={[
            styles.badge,
            { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 },
          ]}
        >
          <MaterialCommunityIcons name="check-decagram" size={14} color={Colors.success600} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '600',
    color: Colors.gray600,
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
