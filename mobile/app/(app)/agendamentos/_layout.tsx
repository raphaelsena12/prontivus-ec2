import { Stack } from 'expo-router';

export default function AgendamentosLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="novo" />
      <Stack.Screen name="telemedicina" />
      <Stack.Screen name="consulta-web" />
      <Stack.Screen name="pagamento-telemedicina" />
    </Stack>
  );
}
