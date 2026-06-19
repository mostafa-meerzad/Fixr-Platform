import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function SharedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}
