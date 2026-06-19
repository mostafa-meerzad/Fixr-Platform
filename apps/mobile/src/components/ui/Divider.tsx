import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';

export function Divider({ vertical = false }: { vertical?: boolean }) {
  return <View style={vertical ? styles.vertical : styles.horizontal} />;
}

const styles = StyleSheet.create({
  horizontal: { height: 1,  backgroundColor: Colors.border, marginVertical: Spacing.sm },
  vertical:   { width: 1,   backgroundColor: Colors.border, marginHorizontal: Spacing.sm },
});
