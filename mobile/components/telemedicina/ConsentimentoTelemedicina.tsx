import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { Colors, BorderRadius } from '../../constants/colors';

interface ConsentimentoTelemedicinaProps {
  visible: boolean;
  medicoNome: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentimentoTelemedicina({
  visible, medicoNome, onAccept, onDecline,
}: ConsentimentoTelemedicinaProps) {
  const [accepted, setAccepted] = useState(false);

  function handleClose() {
    setAccepted(false);
    onDecline();
  }

  function handleAccept() {
    setAccepted(false);
    onAccept();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="document-text" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Termo de Consentimento</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Atendimento por Telemedicina</Text>

          {/* Content */}
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.paragraph}>
              Em conformidade com a Resolução CFM 2.314/2022, declaro que:
            </Text>

            <View style={styles.item}>
              <View style={styles.itemDot} />
              <Text style={styles.itemText}>
                Estou ciente de que a consulta será realizada por meio de tecnologia de comunicação
                à distância (telemedicina), com o(a) Dr(a). {medicoNome}.
              </Text>
            </View>

            <View style={styles.item}>
              <View style={styles.itemDot} />
              <Text style={styles.itemText}>
                Compreendo que a telemedicina possui limitações inerentes e que determinadas
                avaliações podem necessitar de exame presencial.
              </Text>
            </View>

            <View style={styles.item}>
              <View style={styles.itemDot} />
              <Text style={styles.itemText}>
                Autorizo o registro do atendimento em prontuário eletrônico, conforme exigido
                pelo Conselho Federal de Medicina.
              </Text>
            </View>

            <View style={styles.item}>
              <View style={styles.itemDot} />
              <Text style={styles.itemText}>
                Estou ciente de que o médico poderá me encaminhar para atendimento presencial
                caso julgue clinicamente necessário.
              </Text>
            </View>

            <View style={styles.item}>
              <View style={styles.itemDot} />
              <Text style={styles.itemText}>
                Declaro que as informações fornecidas durante a consulta são verdadeiras e que
                estou em condições adequadas para o atendimento remoto.
              </Text>
            </View>

            <View style={styles.item}>
              <View style={styles.itemDot} />
              <Text style={styles.itemText}>
                Compreendo que posso revogar este consentimento a qualquer momento.
              </Text>
            </View>

            {/* Emergency disclaimer */}
            <View style={styles.emergencyBox}>
              <View style={styles.emergencyIcon}>
                <Ionicons name="warning" size={16} color={Colors.error} />
              </View>
              <Text style={styles.emergencyText}>
                A telemedicina não substitui atendimento presencial de urgência ou emergência.
                Em caso de emergência, ligue para o{' '}
                <Text style={styles.emergencyBold}>SAMU (192)</Text> ou dirija-se ao
                pronto-socorro mais próximo.
              </Text>
            </View>

            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.accent} />
              <Text style={styles.privacyText}>
                Seus dados são protegidos conforme nossa Política de Privacidade e a LGPD.
              </Text>
            </View>
          </ScrollView>

          {/* Checkbox + Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAccepted(!accepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
                {accepted && <Ionicons name="checkmark" size={14} color={Colors.white} />}
              </View>
              <Text style={styles.checkboxLabel}>
                Li e concordo com o Termo de Consentimento para Atendimento por Telemedicina
              </Text>
            </TouchableOpacity>

            <Button
              title="Aceitar e continuar"
              onPress={handleAccept}
              disabled={!accepted}
              size="lg"
              icon="checkmark-circle-outline"
            />

            <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 24,
    marginTop: 4,
    marginBottom: 12,
  },
  scroll: {
    paddingHorizontal: 24,
    maxHeight: 340,
  },
  paragraph: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 14,
    fontWeight: '500',
  },
  item: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  emergencyBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.md,
    padding: 14,
    marginTop: 8,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  emergencyIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyText: {
    flex: 1,
    fontSize: 12,
    color: Colors.errorDark,
    lineHeight: 17,
  },
  emergencyBold: {
    fontWeight: '800',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  privacyText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textMuted,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
    fontWeight: '500',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
