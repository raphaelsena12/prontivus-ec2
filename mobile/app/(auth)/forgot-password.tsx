import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';

export default function ForgotPasswordScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableHeader onBack={() => router.back()} />

        <View style={styles.content}>
          <Ionicons name="lock-closed-outline" size={64} color={Colors.primary} />
          <Text style={styles.title}>Recuperar senha</Text>
          <Text style={styles.description}>
            Para recuperar sua senha, entre em contato com a clínica ou acesse o portal web do
            Prontivus.
          </Text>

          <Button
            title="Voltar ao login"
            onPress={() => router.back()}
            variant="outline"
            style={styles.button}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function TouchableHeader({ onBack }: { onBack: () => void }) {
  const { TouchableOpacity } = require('react-native');
  return (
    <TouchableOpacity onPress={onBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={Colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: 24 },
  backButton: { marginBottom: 24, width: 40 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    width: '100%',
    marginTop: 8,
  },
});
