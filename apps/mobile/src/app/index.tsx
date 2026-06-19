import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';

export default function Index() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) return null;

  if (!user) return <Redirect href="/(auth)/phone" />;

  if (user.role === 'EXPERT') return <Redirect href="/(expert)/home" />;

  return <Redirect href="/(homeowner)/home" />;
}
