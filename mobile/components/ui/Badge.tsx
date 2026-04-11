import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../../constants/colors';

type BadgeVariant = 'agendado' | 'confirmado' | 'cancelado' | 'realizado' | 'em_atendimento' | 'concluido' | 'falta' | 'default' | 'success' | 'warning' | 'info';

const variantColors: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  agendado: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  confirmado: { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  em_atendimento: { bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
  cancelado: { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' },
  realizado: { bg: '#F5F3FF', text: '#6D28D9', dot: '#8B5CF6' },
  concluido: { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
  falta: { bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
  default: { bg: Colors.primaryLight, text: Colors.primary, dot: Colors.primary },
  success: { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  warning: { bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
  info: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
};

function getVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    AGENDADA: 'agendado',
    CONFIRMADA: 'confirmado',
    EM_ATENDIMENTO: 'em_atendimento',
    CANCELADA: 'cancelado',
    REALIZADA: 'realizado',
    CONCLUIDA: 'concluido',
    FALTA: 'falta',
    NAO_COMPARECEU: 'cancelado',
  };
  return map[status] ?? 'default';
}

interface BadgeProps {
  label: string;
  status?: string;
  variant?: BadgeVariant;
  showDot?: boolean;
  size?: 'sm' | 'md';
}

export function Badge({ label, status, variant, showDot = true, size = 'md' }: BadgeProps) {
  const v = variant ?? (status ? getVariant(status) : 'default');
  const colors = variantColors[v];

  return (
    <View style={[
      styles.badge,
      { backgroundColor: colors.bg },
      size === 'sm' && styles.badgeSm,
    ]}>
      {showDot && <View style={[styles.dot, { backgroundColor: colors.dot }]} />}
      <Text style={[
        styles.text,
        { color: colors.text },
        size === 'sm' && styles.textSm,
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    gap: 6,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 10,
  },
});
