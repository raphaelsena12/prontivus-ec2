import { useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { SplashAnimated } from '../components/SplashAnimated';

export default function Index() {
  const { token, isLoading } = useAuthStore();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashAnimated onFinish={() => setSplashDone(true)} />;
  }

  if (isLoading) return <LoadingSpinner />;
  if (token) return <Redirect href="/(app)/home" />;
  return <Redirect href="/(auth)/login" />;
}
