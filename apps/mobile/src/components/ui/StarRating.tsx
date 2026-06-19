import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Colors, FontSize } from '../../constants/theme';

interface Props {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md';
}

export function StarRating({ rating, maxStars = 5, size = 'sm' }: Props) {
  const fontSize = size === 'sm' ? FontSize.sm : FontSize.md;
  return (
    <View style={styles.row}>
      {Array.from({ length: maxStars }).map((_, i) => (
        <Text key={i} style={{ fontSize, color: i < Math.round(rating) ? Colors.star : Colors.starEmpty }}>
          ★
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 1 },
});
