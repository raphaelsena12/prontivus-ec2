import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function Index() {
  const { token, isLoading } = useAuthStore();

  if (isLoading) return <LoadingSpinner />;
  if (token) return <Redirect href="/(app)/home" />;
  return <Redirect href="/(auth)/login" />;
}
