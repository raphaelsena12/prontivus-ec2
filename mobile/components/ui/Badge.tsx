import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

type BadgeVariant = 'agendado' | 'confirmado' | 'cancelado' | 'realizado' | 'default';

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  agendado: { bg: '#EFF6FF', text: Colors.statusAgendado },
  confirmado: { bg: '#ECFDF5', text: Colors.statusConfirmado },
  cancelado: { bg: '#FEF2F2', text: Colors.statusCancelado },
  realizado: { bg: '#F3F4F6', text: Colors.statusRealizado },
  default: { bg: Colors.primaryLight, text: Colors.primary },
};

function getVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    AGENDADA: 'agendado',
    CONFIRMADA: 'confirmado',
    CANCELADA: 'cancelado',
    REALIZADA: 'realizado',
  };
  return map[status] ?? 'default';
}

interface BadgeProps {
  label: string;
  status?: string;
  variant?: BadgeVariant;
}

export function Badge({ label, status, variant }: BadgeProps) {
  const v = variant ?? (status ? getVariant(status) : 'default');
  const colors = variantColors[v];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
